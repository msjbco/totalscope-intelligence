import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) throw new Error("Usage: node scripts/client-data/audit-company-export.mjs <csv-path>");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  if (quoted) throw new Error("CSV ended inside a quoted field.");
  return rows;
}

const expectedHeaders = ["entity_id","entity","email","mobilephone","activestatus","address_id","streetnumber","streetname","city","state","zip","user_id","namefirst","namelast","role_id","datetimecreated"];
const parsed = parseCsv(readFileSync(path, "utf8"));
const headers = parsed.shift()?.map((value) => value.trim().toLowerCase()) ?? [];
if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) throw new Error(`Unexpected CSV schema: ${headers.join(",")}`);
const records = parsed.filter((row) => row.some((value) => value.trim() !== "")).map((row, index) => {
  if (row.length !== headers.length) throw new Error(`Row ${index + 2} has ${row.length} columns; expected ${headers.length}.`);
  return Object.fromEntries(headers.map((header, column) => [header, row[column].trim()]));
});

const normalizeName = (value) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const normalizeEmail = (value) => value.trim().toLowerCase();
const normalizePhone = (value) => value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const normalizeZip = (value) => value.trim();
const normalizeState = (value) => value.trim().toUpperCase();
const normalizeAddress = (record) => [record.streetnumber, record.streetname, record.city, normalizeState(record.state), normalizeZip(record.zip)].map(normalizeName).join("|");
const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneValid = (value) => normalizePhone(value).length === 10;
const zipValid = (value) => /^\d{5}(?:-\d{4})?$/.test(value);
const usStates = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" "));

function grouped(values) {
  const map = new Map();
  for (const value of values) if (value !== "") map.set(value, (map.get(value) ?? 0) + 1);
  return map;
}
const duplicateSummary = (map) => ({ values: [...map.values()].filter((count) => count > 1).length, rows: [...map.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0) });
const countBy = (values) => Object.fromEntries([...grouped(values).entries()].sort(([a],[b]) => a.localeCompare(b)));
const distinctByEntity = (selector) => {
  const values = new Map();
  for (const record of records) {
    if (!record.entity_id) continue;
    if (!values.has(record.entity_id)) values.set(record.entity_id, new Set());
    const value = selector(record);
    if (value) values.get(record.entity_id).add(value);
  }
  return values;
};
const sharedAcrossEntities = (selector) => {
  const owners = new Map();
  for (const record of records) {
    const value = selector(record);
    if (!value || !record.entity_id) continue;
    if (!owners.has(value)) owners.set(value, new Set());
    owners.get(value).add(record.entity_id);
  }
  const collisions = [...owners.values()].filter((ids) => ids.size > 1);
  return { values: collisions.length, entityReferences: collisions.reduce((sum, ids) => sum + ids.size, 0) };
};

const entityGroups = distinctByEntity(() => "present");
const addressesByEntity = distinctByEntity((record) => record.address_id);
const contactsByEntity = distinctByEntity((record) => record.user_id);
const namesByEntity = distinctByEntity((record) => normalizeName(record.entity));
const statusByEntity = distinctByEntity((record) => record.activestatus);
const entityAddressPairs = grouped(records.map((record) => record.entity_id && record.address_id ? `${record.entity_id}|${record.address_id}` : ""));
const entityUserPairs = grouped(records.map((record) => record.entity_id && record.user_id ? `${record.entity_id}|${record.user_id}` : ""));
const physicalAddressesByEntity = distinctByEntity(normalizeAddress);
const emailsByEntity = distinctByEntity((record) => normalizeEmail(record.email));
const phonesByEntity = distinctByEntity((record) => normalizePhone(record.mobilephone));
const rawRowHashes = grouped(records.map((record) => createHash("sha256").update(JSON.stringify(record)).digest("hex")));
const normalizedRowHashes = grouped(records.map((record) => createHash("sha256").update(JSON.stringify({
  ...record, entity: normalizeName(record.entity), email: normalizeEmail(record.email), mobilephone: normalizePhone(record.mobilephone), state: normalizeState(record.state), zip: normalizeZip(record.zip),
})).digest("hex")));

const suspicious = {
  conflictingNamesWithinEntity: [...namesByEntity.values()].filter((values) => values.size > 1).length,
  conflictingStatusesWithinEntity: [...statusByEntity.values()].filter((values) => values.size > 1).length,
  conflictingEmailsWithinEntity: [...emailsByEntity.values()].filter((values) => values.size > 1).length,
  conflictingPhonesWithinEntity: [...phonesByEntity.values()].filter((values) => values.size > 1).length,
  duplicatePhysicalAddressesWithinEntity: [...physicalAddressesByEntity.entries()].filter(([entityId, values]) => values.size < (addressesByEntity.get(entityId)?.size ?? 0)).length,
  addressIdSharedAcrossEntities: sharedAcrossEntities((record) => record.address_id),
  userIdSharedAcrossEntities: sharedAcrossEntities((record) => record.user_id),
  normalizedNameSharedAcrossEntities: sharedAcrossEntities((record) => normalizeName(record.entity)),
  emailSharedAcrossEntities: sharedAcrossEntities((record) => normalizeEmail(record.email)),
  phoneSharedAcrossEntities: sharedAcrossEntities((record) => normalizePhone(record.mobilephone)),
  exactAddressSharedAcrossEntities: sharedAcrossEntities(normalizeAddress),
};

const signalPairs = new Map();
for (const [signal, selector] of Object.entries({ name: (r) => normalizeName(r.entity), email: (r) => normalizeEmail(r.email), phone: (r) => normalizePhone(r.mobilephone), address: normalizeAddress })) {
  const owners = new Map();
  for (const record of records) {
    const value = selector(record);
    if (!value || !record.entity_id) continue;
    if (!owners.has(value)) owners.set(value, new Set());
    owners.get(value).add(record.entity_id);
  }
  for (const ids of owners.values()) {
    const sorted = [...ids].sort();
    for (let i = 0; i < sorted.length; i += 1) for (let j = i + 1; j < sorted.length; j += 1) {
      const key = `${sorted[i]}|${sorted[j]}`;
      if (!signalPairs.has(key)) signalPairs.set(key, new Set());
      signalPairs.get(key).add(signal);
    }
  }
}

const output = {
  source: {
    filename: path.split(/[\\/]/).pop(),
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    byteSize: readFileSync(path).length,
    columns: headers.length,
  },
  cardinality: {
    rows: records.length,
    uniqueEntityIds: entityGroups.size,
    missingEntityIdRows: records.filter((record) => !record.entity_id).length,
    duplicateEntityIds: duplicateSummary(grouped(records.map((record) => record.entity_id))),
    uniqueAddressIds: grouped(records.map((record) => record.address_id)).size,
    uniqueEntityAddressPairs: entityAddressPairs.size,
    missingAddressIdRows: records.filter((record) => !record.address_id).length,
    duplicateAddressIds: duplicateSummary(grouped(records.map((record) => record.address_id))),
    companiesWithMultipleAddresses: [...addressesByEntity.values()].filter((values) => values.size > 1).length,
    companiesWithMultipleContacts: [...contactsByEntity.values()].filter((values) => values.size > 1).length,
    duplicateEntityAddressPairs: duplicateSummary(entityAddressPairs),
    uniqueUserIds: grouped(records.map((record) => record.user_id)).size,
    uniqueEntityUserPairs: entityUserPairs.size,
    missingUserIdRows: records.filter((record) => !record.user_id).length,
  },
  duplicates: {
    companyNames: duplicateSummary(grouped(records.map((record) => record.entity))),
    normalizedCompanyNames: duplicateSummary(grouped(records.map((record) => normalizeName(record.entity)))),
    emails: duplicateSummary(grouped(records.map((record) => normalizeEmail(record.email)))),
    emailDomains: duplicateSummary(grouped(records.map((record) => normalizeEmail(record.email).split("@")[1] ?? ""))),
    phones: duplicateSummary(grouped(records.map((record) => normalizePhone(record.mobilephone)))),
    exactRows: duplicateSummary(rawRowHashes),
    normalizedRows: duplicateSummary(normalizedRowHashes),
  },
  missing: Object.fromEntries(["entity","streetnumber","streetname","city","state","zip","email","mobilephone","namefirst","namelast","role_id","datetimecreated"].map((field) => [field, records.filter((record) => !record[field]).length])),
  malformed: {
    zip: records.filter((record) => record.zip && !zipValid(record.zip)).length,
    state: records.filter((record) => record.state && !usStates.has(normalizeState(record.state))).length,
    email: records.filter((record) => record.email && !emailValid(normalizeEmail(record.email))).length,
    phone: records.filter((record) => record.mobilephone && !phoneValid(record.mobilephone)).length,
    nonUsAddress: "not_determinable_no_country_field",
  },
  values: {
    activeStatus: countBy(records.map((record) => record.activestatus || "<blank>")),
    uniqueEntitiesByActiveStatus: Object.fromEntries([...statusByEntity.entries()].reduce((map,[,statuses]) => { const status=[...statuses][0] || "<blank>"; map.set(status,(map.get(status)??0)+1); return map; },new Map())),
    roleId: countBy(records.map((record) => record.role_id || "<blank>")),
  },
  reviewSignals: suspicious,
  nearDuplicateReviewPairs: {
    sharingAtLeastTwoSignals: [...signalPairs.values()].filter((signals) => signals.size >= 2).length,
    sharingAtLeastThreeSignals: [...signalPairs.values()].filter((signals) => signals.size >= 3).length,
    sharingNameAndAddress: [...signalPairs.values()].filter((signals) => signals.has("name") && signals.has("address")).length,
  },
  policy: {
    identity: "entity_id and address_id are audit candidates; no name-based merge performed",
    inactiveMapping: "unresolved_until_status_semantics_are_confirmed",
    nearDuplicateDefinition: "different entity_id values sharing deterministic normalized identity signals; review-only",
    piiOutput: "aggregate_counts_only",
  },
  importReadiness: {
    entitiesMissingEveryCompanyName: [...entityGroups.keys()].filter((entityId) => !(namesByEntity.get(entityId)?.size)).length,
    rowsWithBlockingIdentityOrNameError: records.filter((record) => !record.entity_id || !record.entity).length,
    rowsWithNonBlockingFormatWarning: records.filter((record) => (record.state && !usStates.has(normalizeState(record.state))) || (record.zip && !zipValid(record.zip)) || (record.email && !emailValid(normalizeEmail(record.email))) || (record.mobilephone && !phoneValid(record.mobilephone))).length,
    proposedAcceptedRows: records.filter((record) => record.entity_id && record.entity).length,
    proposedQuarantinedRows: records.filter((record) => !record.entity_id || !record.entity).length,
    proposedCanonicalClients: new Set(records.filter((record) => record.entity_id && record.entity).map((record) => record.entity_id)).size,
    proposedCanonicalLocations: new Set(records.filter((record) => record.entity_id && record.entity).map((record) => `${record.entity_id}|${record.address_id}`)).size,
    proposedCanonicalPeople: new Set(records.filter((record) => record.entity_id && record.entity && record.user_id).map((record) => record.user_id)).size,
    proposedClientContactRelationships: new Set(records.filter((record) => record.entity_id && record.entity && record.user_id).map((record) => `${record.entity_id}|${record.user_id}`)).size,
  },
};

console.log(JSON.stringify(output, null, 2));
