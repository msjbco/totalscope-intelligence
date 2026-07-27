import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_FIXTURE_ROOT = join(REPOSITORY_ROOT, "tests/fixtures/c3");
const AVAILABILITY = new Set(["captured", "not_captured", "partially_captured", "invalid", "not_applicable"]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function validValue(type, value) {
  if (value === null) return true;
  if (type === "string" || type === "currency" || type === "availability" || type === "sha256") {
    if (typeof value !== "string") return false;
    if (type === "currency") return /^[A-Z]{3}$/.test(value);
    if (type === "availability") return AVAILABILITY.has(value);
    if (type === "sha256") return /^[a-f0-9]{64}$/.test(value);
    return true;
  }
  if (type === "minor_units" || type === "integer") return Number.isSafeInteger(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "date") return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (type === "timestamp") return typeof value === "string" && Number.isFinite(Date.parse(value));
  if (type === "json") return true;
  return false;
}

export function validateContract(contract) {
  const errors = [];
  if (!contract.contractVersion) errors.push("contractVersion is required");
  if (!contract.sourceSystem) errors.push("sourceSystem is required");
  if (!Array.isArray(contract.modeSupport) || !contract.modeSupport.includes("full") || !contract.modeSupport.includes("incremental")) {
    errors.push(`${contract.contractVersion}: full and incremental modes are required`);
  }
  const tableNames = new Set();
  for (const table of contract.tables ?? []) {
    if (tableNames.has(table.name)) errors.push(`${contract.contractVersion}: duplicate table ${table.name}`);
    tableNames.add(table.name);
    const fields = new Set((table.fields ?? []).map((field) => field.name));
    if (!table.stableKey?.length) errors.push(`${contract.contractVersion}.${table.name}: stableKey is required`);
    for (const key of table.stableKey ?? []) {
      if (!fields.has(key)) errors.push(`${contract.contractVersion}.${table.name}: stable key field ${key} is absent`);
    }
  }
  for (const relationship of contract.relationships ?? []) {
    if (!tableNames.has(relationship.fromTable)) errors.push(`relationship source table ${relationship.fromTable} is absent`);
    if (!tableNames.has(relationship.toTable)) errors.push(`relationship target table ${relationship.toTable} is absent`);
  }
  return errors;
}

function recordKey(table, record) {
  return table.stableKey.map((field) => String(record[field] ?? "")).join("\u001f");
}

export function loadFixturePackage(fixtureRoot = DEFAULT_FIXTURE_ROOT) {
  const manifest = readJson(join(fixtureRoot, "manifest.json"));
  const contracts = {};
  const datasets = {};
  for (const declared of manifest.contracts) {
    const contract = readJson(join(REPOSITORY_ROOT, declared.path));
    contracts[declared.version] = contract;
    datasets[declared.version] = Object.fromEntries(
      Object.entries(manifest.datasets[declared.version]).map(([table, filename]) => [table, readJson(join(fixtureRoot, filename))]),
    );
  }
  const expected = readJson(join(fixtureRoot, "expected.json"));
  return { manifest, contracts, datasets, expected };
}

export function validateFixturePackage(pkg) {
  const errors = [];
  for (const [version, contract] of Object.entries(pkg.contracts)) {
    errors.push(...validateContract(contract));
    if (contract.contractVersion !== version) errors.push(`${version}: manifest and contract version differ`);
    const dataset = pkg.datasets[version];
    for (const table of contract.tables) {
      const records = dataset[table.name];
      if (!Array.isArray(records)) {
        errors.push(`${version}.${table.name}: fixture table is absent`);
        continue;
      }
      const keys = new Set();
      for (const [index, record] of records.entries()) {
        const key = recordKey(table, record);
        if (keys.has(key)) errors.push(`${version}.${table.name}[${index}]: duplicate stable key ${key}`);
        keys.add(key);
        for (const field of table.fields) {
          const value = record[field.name];
          if (field.required && (value === null || value === undefined || value === "")) {
            errors.push(`${version}.${table.name}[${index}].${field.name}: required value is missing`);
          } else if (value !== undefined && !validValue(field.type, value)) {
            errors.push(`${version}.${table.name}[${index}].${field.name}: invalid ${field.type}`);
          }
        }
      }
    }
    for (const relationship of contract.relationships ?? []) {
      const targetValues = new Set((dataset[relationship.toTable] ?? []).map((record) => record[relationship.toField]));
      for (const [index, record] of (dataset[relationship.fromTable] ?? []).entries()) {
        const value = record[relationship.fromField];
        if (value == null && !relationship.required) continue;
        if (!targetValues.has(value)) {
          errors.push(`${version}.${relationship.fromTable}[${index}].${relationship.fromField}: unresolved reference ${String(value)}`);
        }
      }
    }
  }

  const allTables = Object.assign({}, ...Object.values(pkg.datasets));
  for (const [table, expected] of Object.entries(pkg.expected.tableCounts)) {
    const actual = allTables[table]?.length;
    if (actual !== expected) errors.push(`${table}: expected ${expected} fixture records, received ${String(actual)}`);
  }
  for (const assertion of pkg.expected.explicitZeroAssertions) {
    const record = allTables[assertion.table]?.find((row) => row[assertion.idField] === assertion.id);
    if (record?.[assertion.field] !== 0) errors.push(`${assertion.table}.${assertion.id}.${assertion.field}: expected explicit zero`);
  }
  for (const assertion of pkg.expected.missingValueAssertions) {
    const record = allTables[assertion.table]?.find((row) => row[assertion.idField] === assertion.id);
    if (record?.[assertion.field] !== null) errors.push(`${assertion.table}.${assertion.id}.${assertion.field}: expected explicit null`);
  }

  const operationalFiles = new Set(pkg.datasets["tsi-historical-v1"].files.map((record) => record.totalscope_file_id));
  const operationalClients = new Set(pkg.datasets["tsi-historical-v1"].clients.map((record) => record.client_id));
  for (const invoice of pkg.datasets["stripe-periodic-v1"].invoices) {
    if (!operationalFiles.has(invoice.totalscope_file_id)) errors.push(`invoice ${invoice.invoice_id}: unresolved TotalScope file ID`);
    if (!operationalClients.has(invoice.client_id)) errors.push(`invoice ${invoice.invoice_id}: unresolved client ID`);
  }

  return {
    status: errors.length ? "fail" : "pass",
    errors,
    fixtureVersion: pkg.manifest.fixtureVersion,
    fingerprint: fingerprint({ manifest: pkg.manifest, contracts: pkg.contracts, datasets: pkg.datasets, expected: pkg.expected }),
    tableCounts: Object.fromEntries(Object.entries(allTables).map(([table, rows]) => [table, rows.length]).sort()),
  };
}

export function inspectFixtures(fixtureRoot = DEFAULT_FIXTURE_ROOT) {
  return validateFixturePackage(loadFixturePackage(fixtureRoot));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectFixtures(process.argv[2] ? resolve(process.argv[2]) : DEFAULT_FIXTURE_ROOT);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.status === "pass" ? 0 : 1;
}
