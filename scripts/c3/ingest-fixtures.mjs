import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint, loadFixturePackage, validateFixturePackage } from "./validate-fixtures.mjs";

const BATCH_SIZE = 100;
const IMPORTER_VERSION = "c3-fixture-ingestion-v1";
const MAPPING_VERSION = "c3-fixture-normalization-v1";

function parseArguments(argv) {
  const command = argv[0] ?? "inspect";
  if (!["inspect", "import", "validate"].includes(command)) throw new Error(`Unsupported command: ${command}`);
  const values = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    values[token.slice(2)] = argv[index + 1];
    index += 1;
  }
  return { command, values };
}

function targetConfiguration(values) {
  const target = process.env.TOTALSCOPE_IMPORT_TARGET;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expectedRef = process.env.TOTALSCOPE_IMPORT_PROJECT_REF;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  if (!["local", "staging"].includes(target)) throw new Error("TOTALSCOPE_IMPORT_TARGET must be local or staging");
  if (values["confirm-target"] !== target) throw new Error(`Import confirmation mismatch: expected --confirm-target ${target}`);
  const parsed = new URL(url);
  const local = ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  if (target === "local" && !local) throw new Error("Local imports require a loopback Supabase URL");
  if (target === "staging") {
    if (local) throw new Error("Staging imports require a hosted Supabase URL");
    if (!expectedRef) throw new Error("TOTALSCOPE_IMPORT_PROJECT_REF is required for staging");
    if (values["confirm-project-ref"] !== expectedRef) throw new Error("Staging project-reference confirmation mismatch");
    if (parsed.hostname.split(".")[0] !== expectedRef) throw new Error("SUPABASE_URL does not match the confirmed staging project reference");
    if (/prod|production/i.test(`${parsed.hostname}:${expectedRef}`)) throw new Error("Production-like target rejected");
  }
  return { target, url: url.replace(/\/$/, ""), key, projectRef: local ? "local" : expectedRef };
}

async function rest(config, path, options = {}) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase ${options.method ?? "GET"} ${path.split("?")[0]} failed (${response.status}): ${body.slice(0, 1000)}`);
  return body ? JSON.parse(body) : null;
}

async function selectOne(config, table, filters) {
  const query = Object.entries(filters).map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`).join("&");
  const rows = await rest(config, `${table}?${query}&select=*&limit=1`);
  return rows[0] ?? null;
}

async function insertIgnoringConflicts(config, table, rows, conflictColumns) {
  if (!rows.length) return;
  await rest(config, `${table}?on_conflict=${encodeURIComponent(conflictColumns.join(","))}`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

async function upsertMerging(config, table, rows, conflictColumns) {
  if (!rows.length) return;
  await rest(config, `${table}?on_conflict=${encodeURIComponent(conflictColumns.join(","))}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

async function patch(config, table, filters, values) {
  const query = Object.entries(filters).map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`).join("&");
  await rest(config, `${table}?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(values),
  });
}

function stableKey(table, record) {
  return table.stableKey.map((field) => String(record[field])).join("\u001f");
}

function datasetPlan(pkg) {
  return Object.entries(pkg.contracts).map(([version, contract]) => {
    const dataset = pkg.datasets[version];
    const tables = contract.tables.map((table) => ({
      name: table.name,
      count: dataset[table.name].length,
      sha256: fingerprint(dataset[table.name]),
    }));
    return {
      contractVersion: version,
      sourceSystem: contract.sourceSystem,
      datasetType: contract.datasetType,
      ingestionMode: pkg.manifest.mode,
      parserVersion: IMPORTER_VERSION,
      mappingVersion: MAPPING_VERSION,
      artifactSetFingerprint: fingerprint({ version, mode: pkg.manifest.mode, dataset }),
      tables,
      recordCount: tables.reduce((sum, table) => sum + table.count, 0),
    };
  });
}

export function inspect() {
  const pkg = loadFixturePackage();
  const validation = validateFixturePackage(pkg);
  if (validation.status !== "pass") throw new Error(validation.errors.join("\n"));
  return {
    fixtureVersion: pkg.manifest.fixtureVersion,
    capturedAt: pkg.manifest.capturedAt,
    fixtureFingerprint: validation.fingerprint,
    batchSize: BATCH_SIZE,
    plans: datasetPlan(pkg),
  };
}

async function ensureContract(config, contract, capturedAt) {
  const row = {
    source_system: contract.sourceSystem,
    dataset_type: contract.datasetType,
    contract_version: contract.contractVersion,
    schema_sha256: fingerprint(contract),
    definition: contract,
    effective_from: capturedAt,
    approval_status: "approved",
    approved_at: capturedAt,
  };
  await insertIgnoringConflicts(config, "source_contracts", [row], ["source_system", "dataset_type", "contract_version"]);
  return selectOne(config, "source_contracts", {
    source_system: contract.sourceSystem,
    dataset_type: contract.datasetType,
    contract_version: contract.contractVersion,
  });
}

async function ensureRun(config, contract, plan, capturedAt) {
  const row = {
    source_system: contract.sourceSystem,
    dataset_type: contract.datasetType,
    ingestion_mode: plan.ingestionMode,
    artifact_set_fingerprint: plan.artifactSetFingerprint,
    parser_version: plan.parserVersion,
    mapping_version: plan.mappingVersion,
    status: "running",
    started_at: capturedAt,
    execution_actor: "c3-deterministic-fixture-importer",
    metadata: { fixture_version: "c3-deterministic-v1", business_timezone: "America/New_York" },
  };
  await insertIgnoringConflicts(config, "ingestion_runs", [row], ["source_system", "dataset_type", "artifact_set_fingerprint", "parser_version", "mapping_version"]);
  const run = await selectOne(config, "ingestion_runs", {
    source_system: contract.sourceSystem,
    dataset_type: contract.datasetType,
    artifact_set_fingerprint: plan.artifactSetFingerprint,
    parser_version: plan.parserVersion,
    mapping_version: plan.mappingVersion,
  });
  await patch(config, "ingestion_runs", { id: run.id }, { status: "running", completed_at: null });
  return run;
}

async function nextRetry(config, runId, stepName, batchSequence) {
  const rows = await rest(config, `ingestion_run_steps?ingestion_run_id=eq.${runId}&step_name=eq.${encodeURIComponent(stepName)}&batch_sequence=eq.${batchSequence}&select=retry_number&order=retry_number.desc&limit=1`);
  return rows.length ? Number(rows[0].retry_number) + 1 : 0;
}

async function recordStep(config, runId, stepName, batchSequence, retryNumber, count, capturedAt) {
  await rest(config, "ingestion_run_steps", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      ingestion_run_id: runId,
      step_name: stepName,
      batch_sequence: batchSequence,
      retry_number: retryNumber,
      status: "completed",
      input_count: count,
      output_count: count,
      started_at: capturedAt,
      completed_at: capturedAt,
    }),
  });
}

async function importDataset(config, pkg, version, contract, plan) {
  const contractRow = await ensureContract(config, contract, pkg.manifest.capturedAt);
  const run = await ensureRun(config, contract, plan, pkg.manifest.capturedAt);
  const dataset = pkg.datasets[version];
  let totalRecords = 0;
  let stepSequence = 0;

  try {
    for (const table of contract.tables) {
      const records = dataset[table.name];
      const artifactSha = fingerprint(records);
      await insertIgnoringConflicts(config, "source_artifacts", [{
        source_contract_id: contractRow.id,
        source_system: contract.sourceSystem,
        artifact_type: "json_fixture",
        filename: `${table.name}.json`,
        sha256: artifactSha,
        byte_size: Buffer.byteLength(JSON.stringify(records)),
        received_at: pkg.manifest.capturedAt,
        metadata: { logical_table: table.name, fixture_version: pkg.manifest.fixtureVersion },
      }], ["source_system", "sha256"]);
      const artifact = await selectOne(config, "source_artifacts", { source_system: contract.sourceSystem, sha256: artifactSha });
      await insertIgnoringConflicts(config, "ingestion_run_artifacts", [{
        ingestion_run_id: run.id,
        source_artifact_id: artifact.id,
        logical_table: table.name,
        artifact_sequence: stepSequence,
      }], ["ingestion_run_id", "source_artifact_id"]);

      for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
        const batch = records.slice(offset, offset + BATCH_SIZE);
        const batchSequence = Math.floor(offset / BATCH_SIZE);
        const retryNumber = await nextRetry(config, run.id, `records:${table.name}`, batchSequence);
        await insertIgnoringConflicts(config, "ingestion_records", batch.map((record, index) => ({
          source_artifact_id: artifact.id,
          ingestion_run_id: run.id,
          logical_table: table.name,
          source_locator: `${table.name}:${offset + index + 1}`,
          stable_source_key: stableKey(table, record),
          raw_payload: record,
          row_sha256: fingerprint(record),
          source_observed_at: record.updated_at ?? record.effective_at ?? record.created_at ?? record.failed_at ?? record.refunded_at ?? record.opened_at ?? record.assessed_at ?? pkg.manifest.capturedAt,
          source_timezone: "America/New_York",
          source_timezone_status: "explicit_offset",
          parsing_status: "parsed",
        })), ["source_artifact_id", "logical_table", "source_locator"]);
        await recordStep(config, run.id, `records:${table.name}`, batchSequence, retryNumber, batch.length, pkg.manifest.capturedAt);
        totalRecords += batch.length;
      }
      stepSequence += 1;
    }

    const imported = await rest(config, `ingestion_records?ingestion_run_id=eq.${run.id}&select=id,logical_table,stable_source_key,raw_payload`);
    for (let offset = 0; offset < imported.length; offset += BATCH_SIZE) {
      const batch = imported.slice(offset, offset + BATCH_SIZE);
      const batchSequence = Math.floor(offset / BATCH_SIZE);
      const retryNumber = await nextRetry(config, run.id, "normalize", batchSequence);
      await insertIgnoringConflicts(config, "normalization_attempts", batch.map((record) => ({
        ingestion_record_id: record.id,
        ingestion_run_id: run.id,
        mapping_version: MAPPING_VERSION,
        attempt_number: 1,
        normalized_payload: record.raw_payload,
        outcome: "accepted",
      })), ["ingestion_record_id", "mapping_version", "attempt_number"]);
      await recordStep(config, run.id, "normalize", batchSequence, retryNumber, batch.length, pkg.manifest.capturedAt);
    }
    await patch(config, "ingestion_runs", { id: run.id }, {
      status: "completed",
      completed_at: pkg.manifest.capturedAt,
      source_record_count: totalRecords,
      accepted_record_count: totalRecords,
      quarantined_record_count: 0,
      rejected_record_count: 0,
      warning_count: 0,
      error_count: 0,
    });
    return { runId: run.id, sourceSystem: contract.sourceSystem, status: "completed", recordCount: totalRecords };
  } catch (error) {
    await patch(config, "ingestion_runs", { id: run.id }, {
      status: "failed",
      completed_at: pkg.manifest.capturedAt,
      error_count: 1,
      metadata: { fixture_version: pkg.manifest.fixtureVersion, failure: error instanceof Error ? error.message.slice(0, 500) : "unknown" },
    });
    throw error;
  }
}

function normalizedName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceRecordMap(records, logicalTable) {
  return new Map(records.filter((record) => record.logical_table === logicalTable).map((record) => [record.stable_source_key, record]));
}

async function rowsByStableKey(config, table, stableColumn) {
  const rows = await rest(config, `${table}?select=id,${stableColumn}`);
  return new Map(rows.map((row) => [row[stableColumn], row.id]));
}

function lineageRow(entityType, entityId, field, record, sourcePath, availability = "captured") {
  return {
    canonical_entity_type: entityType,
    canonical_entity_id: entityId,
    canonical_field_name: field,
    ingestion_record_id: record.id,
    ingestion_run_id: record.ingestion_run_id,
    source_field_path: sourcePath,
    transformation_version: MAPPING_VERSION,
    authority_rule: "approved_fixture_contract",
    availability,
    confidence: "source_provided",
    source_observed_at: record.source_observed_at,
  };
}

async function promoteOperationalFixtures(config, pkg, runId) {
  const dataset = pkg.datasets["tsi-historical-v1"];
  const records = await rest(config, `ingestion_records?ingestion_run_id=eq.${runId}&select=id,ingestion_run_id,logical_table,stable_source_key,source_observed_at`);
  const clientsSource = sourceRecordMap(records, "clients");
  const branchesSource = sourceRecordMap(records, "branches");
  const usersSource = sourceRecordMap(records, "users");
  const filesSource = sourceRecordMap(records, "files");

  await upsertMerging(config, "clients", dataset.clients.map((row) => ({
    stable_client_id: row.client_id,
    display_name: row.client_name,
    normalized_name: normalizedName(row.client_name),
    active: row.active,
    first_ingestion_run_id: runId,
    last_ingestion_run_id: runId,
    source_last_observed_at: row.updated_at,
  })), ["stable_client_id"]);
  const clientIds = await rowsByStableKey(config, "clients", "stable_client_id");
  await insertIgnoringConflicts(config, "client_aliases", dataset.clients.map((row) => ({
    client_id: clientIds.get(row.client_id),
    source_system: "totalscope_export",
    external_id: row.client_id,
    raw_alias: row.client_name,
    normalized_alias: normalizedName(row.client_name),
    ingestion_record_id: clientsSource.get(row.client_id).id,
  })), ["source_system", "external_id"]);

  await upsertMerging(config, "branches", dataset.branches.map((row) => ({
    client_id: clientIds.get(row.client_id),
    stable_branch_id: row.branch_id,
    display_name: row.branch_name,
    normalized_name: normalizedName(row.branch_name),
    active: row.active,
    first_ingestion_run_id: runId,
    last_ingestion_run_id: runId,
    source_last_observed_at: row.updated_at,
  })), ["stable_branch_id"]);
  const branchIds = await rowsByStableKey(config, "branches", "stable_branch_id");
  await insertIgnoringConflicts(config, "branch_aliases", dataset.branches.map((row) => ({
    branch_id: branchIds.get(row.branch_id),
    source_system: "totalscope_export",
    external_id: row.branch_id,
    raw_alias: row.branch_name,
    normalized_alias: normalizedName(row.branch_name),
    ingestion_record_id: branchesSource.get(row.branch_id).id,
  })), ["source_system", "external_id"]);

  await upsertMerging(config, "operational_people", dataset.users.map((row) => ({
    stable_user_id: row.user_id,
    display_name: row.display_name,
    normalized_name: normalizedName(row.display_name),
    work_email: row.work_email,
    active: row.active,
    first_ingestion_run_id: runId,
    last_ingestion_run_id: runId,
    source_last_observed_at: row.updated_at,
  })), ["stable_user_id"]);
  const personIds = await rowsByStableKey(config, "operational_people", "stable_user_id");

  await upsertMerging(config, "operational_files", dataset.files.map((row) => ({
    stable_file_id: row.totalscope_file_id,
    client_id: clientIds.get(row.client_id),
    branch_id: branchIds.get(row.branch_id),
    service_type: row.service_type,
    current_status: row.current_status,
    current_status_authority: "source_provided_fixture",
    submitted_at: row.submitted_at,
    submitted_at_availability: row.submitted_at === null ? "not_captured" : "captured",
    completed_at: row.completed_at,
    completed_at_availability: row.completed_at === null ? "not_applicable" : "captured",
    carrier_source_name: row.carrier_name,
    financial_availability: row.financial_availability,
    source_timezone: "America/New_York",
    source_timezone_status: "explicit_offset",
    first_ingestion_run_id: runId,
    last_ingestion_run_id: runId,
    source_last_observed_at: row.updated_at,
  })), ["stable_file_id"]);
  const fileIds = await rowsByStableKey(config, "operational_files", "stable_file_id");

  for (const [tableName, sourceKey, rows, target, key, mapper] of [
    ["status_history", "status_event_id", dataset.status_history, "file_status_events", "stable_status_event_id", (row, source) => ({
      stable_status_event_id: row.status_event_id,
      operational_file_id: fileIds.get(row.totalscope_file_id),
      status: row.status,
      effective_at: row.effective_at,
      source_timezone: "America/New_York",
      source_timezone_status: "explicit_offset",
      ingestion_record_id: source.id,
      ingestion_run_id: runId,
    })],
    ["assignments", "assignment_id", dataset.assignments, "file_assignments", "stable_assignment_id", (row, source) => ({
      stable_assignment_id: row.assignment_id,
      operational_file_id: fileIds.get(row.totalscope_file_id),
      operational_person_id: personIds.get(row.user_id),
      assignment_type: row.assignment_type,
      started_at: row.started_at,
      ended_at: row.ended_at,
      ingestion_record_id: source.id,
      ingestion_run_id: runId,
    })],
    ["notes", "note_id", dataset.notes, "file_notes", "stable_note_id", (row, source) => ({
      stable_note_id: row.note_id,
      operational_file_id: fileIds.get(row.totalscope_file_id),
      note_body: row.body,
      note_body_availability: row.body === null ? "not_captured" : "captured",
      source_created_at: row.created_at,
      ingestion_record_id: source.id,
      ingestion_run_id: runId,
    })],
    ["documents", "document_id", dataset.documents, "file_documents", "stable_document_id", (row, source) => ({
      stable_document_id: row.document_id,
      operational_file_id: fileIds.get(row.totalscope_file_id),
      document_type: row.document_type,
      filename: row.filename,
      sha256: row.sha256,
      ingestion_record_id: source.id,
      ingestion_run_id: runId,
    })],
    ["tags", "tag_event_id", dataset.tags, "file_tags", "stable_tag_event_id", (row, source) => ({
      stable_tag_event_id: row.tag_event_id,
      operational_file_id: fileIds.get(row.totalscope_file_id),
      tag: row.tag,
      normalized_tag: normalizedName(row.tag),
      ingestion_record_id: source.id,
      ingestion_run_id: runId,
    })],
    ["custom_fields", "custom_field_fact_id", dataset.custom_fields, "file_custom_field_facts", "stable_custom_field_fact_id", (row, source) => ({
      stable_custom_field_fact_id: row.custom_field_fact_id,
      operational_file_id: fileIds.get(row.totalscope_file_id),
      field_key: row.field_key,
      raw_value: row.raw_value,
      normalized_value: row.raw_value,
      availability: row.raw_value === null ? "not_captured" : "captured",
      mapping_version: MAPPING_VERSION,
      ingestion_record_id: source.id,
      ingestion_run_id: runId,
    })],
  ]) {
    const sources = sourceRecordMap(records, tableName);
    await insertIgnoringConflicts(config, target, rows.map((row) => mapper(row, sources.get(row[sourceKey]))), [key]);
  }

  const lineage = [];
  for (const row of dataset.clients) {
    const source = clientsSource.get(row.client_id);
    lineage.push(lineageRow("client", clientIds.get(row.client_id), "display_name", source, "clients.client_name"));
  }
  for (const row of dataset.branches) {
    const source = branchesSource.get(row.branch_id);
    lineage.push(lineageRow("branch", branchIds.get(row.branch_id), "display_name", source, "branches.branch_name"));
  }
  for (const row of dataset.users) {
    const source = usersSource.get(row.user_id);
    const id = personIds.get(row.user_id);
    lineage.push(lineageRow("operational_person", id, "display_name", source, "users.display_name"));
    lineage.push(lineageRow("operational_person", id, "work_email", source, "users.work_email", row.work_email === null ? "not_captured" : "captured"));
  }
  for (const row of dataset.files) {
    const source = filesSource.get(row.totalscope_file_id);
    const id = fileIds.get(row.totalscope_file_id);
    for (const [field, sourceField, availability] of [
      ["client_id", "client_id", "captured"],
      ["branch_id", "branch_id", "captured"],
      ["service_type", "service_type", "captured"],
      ["current_status", "current_status", "captured"],
      ["submitted_at", "submitted_at", row.submitted_at === null ? "not_captured" : "captured"],
      ["completed_at", "completed_at", row.completed_at === null ? "not_applicable" : "captured"],
      ["carrier_source_name", "carrier_name", row.carrier_name === null ? "not_captured" : "captured"],
      ["financial_availability", "financial_availability", "captured"],
    ]) {
      lineage.push(lineageRow("operational_file", id, field, source, `files.${sourceField}`, availability));
    }
  }
  await insertIgnoringConflicts(config, "canonical_field_lineage", lineage, [
    "canonical_entity_type", "canonical_entity_id", "canonical_field_name", "ingestion_record_id", "transformation_version",
  ]);

  return {
    clients: clientIds.size,
    branches: branchIds.size,
    people: personIds.size,
    files: fileIds.size,
    statusEvents: dataset.status_history.length,
    assignments: dataset.assignments.length,
    lineage: lineage.length,
  };
}

export async function importFixtures(config) {
  const pkg = loadFixturePackage();
  const validation = validateFixturePackage(pkg);
  if (validation.status !== "pass") throw new Error(validation.errors.join("\n"));
  const plans = datasetPlan(pkg);
  const results = [];
  for (const [version, contract] of Object.entries(pkg.contracts)) {
    results.push(await importDataset(config, pkg, version, contract, plans.find((plan) => plan.contractVersion === version)));
  }
  const operationalRun = results.find((result) => result.sourceSystem === "totalscope_export");
  const canonical = await promoteOperationalFixtures(config, pkg, operationalRun.runId);
  return { fixtureVersion: pkg.manifest.fixtureVersion, fixtureFingerprint: validation.fingerprint, results, canonical };
}

export async function validateDatabase(config) {
  const plan = inspect();
  const results = [];
  for (const expected of plan.plans) {
    const rows = await rest(config, `ingestion_runs?source_system=eq.${encodeURIComponent(expected.sourceSystem)}&dataset_type=eq.${encodeURIComponent(expected.datasetType)}&artifact_set_fingerprint=eq.${expected.artifactSetFingerprint}&select=id,status,source_record_count,accepted_record_count,quarantined_record_count,rejected_record_count,error_count`);
    if (rows.length !== 1) throw new Error(`${expected.sourceSystem}: expected one deterministic ingestion run, received ${rows.length}`);
    const run = rows[0];
    const records = await rest(config, `ingestion_records?ingestion_run_id=eq.${run.id}&select=id`);
    const attempts = await rest(config, `normalization_attempts?ingestion_run_id=eq.${run.id}&select=id`);
    if (run.status !== "completed") throw new Error(`${expected.sourceSystem}: run status is ${run.status}`);
    if (Number(run.source_record_count) !== expected.recordCount || records.length !== expected.recordCount || attempts.length !== expected.recordCount) {
      throw new Error(`${expected.sourceSystem}: expected ${expected.recordCount} records/attempts`);
    }
    results.push({ sourceSystem: expected.sourceSystem, runId: run.id, status: run.status, records: records.length, normalizationAttempts: attempts.length });
  }
  const canonicalExpected = {
    clients: 2,
    branches: 3,
    operational_people: 3,
    operational_files: 6,
    file_status_events: 12,
    file_assignments: 6,
    file_notes: 2,
    file_documents: 2,
    file_tags: 2,
    file_custom_field_facts: 2,
    canonical_field_lineage: 59,
  };
  const canonicalCounts = {};
  for (const [table, expected] of Object.entries(canonicalExpected)) {
    const rows = await rest(config, `${table}?select=id`);
    canonicalCounts[table] = rows.length;
    if (rows.length !== expected) throw new Error(`${table}: expected ${expected}, received ${rows.length}`);
  }
  return { status: "pass", results, canonicalCounts };
}

async function main() {
  const { command, values } = parseArguments(process.argv.slice(2));
  if (command === "inspect") {
    process.stdout.write(`${JSON.stringify(inspect(), null, 2)}\n`);
    return;
  }
  const config = targetConfiguration(values);
  process.stderr.write(`Confirmed C3 import target: ${config.target} (${config.projectRef})\n`);
  const result = command === "import" ? await importFixtures(config) : await validateDatabase(config);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
