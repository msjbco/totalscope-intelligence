import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildImportPlan, normalizeName, parseCompanyExport } from "./company-export-core.mjs";

const EXPECTED_PROJECT_REF = "ygeahqczlrwaadvlsiew";
const SOURCE_SYSTEM = "totalscope_company_export";

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) values[argv[index].replace(/^--/, "")] = argv[index + 1];
  if (!values.source) throw new Error("--source is required");
  if (values["confirm-project-ref"] !== EXPECTED_PROJECT_REF) throw new Error("Hosted collision check requires the exact staging project confirmation.");
  return values;
}

function target(apiKeysJson) {
  const url = process.env.SUPABASE_URL;
  const apiKeys = apiKeysJson ? JSON.parse(apiKeysJson) : [];
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? apiKeys.find(item => item.id === "service_role")?.api_key;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  const host = new URL(url).hostname;
  if (host !== `${EXPECTED_PROJECT_REF}.supabase.co`) throw new Error("Collision check target is not the approved isolated staging project.");
  return { url: url.replace(/\/$/, ""), key };
}

async function rest(client, table, select) {
  const response = await fetch(`${client.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
    headers: { apikey: client.key, Authorization: `Bearer ${client.key}` },
  });
  const body = await response.text();
  if (!response.ok) {
    if (response.status === 404 || body.includes('42P01')) return [];
    throw new Error(`Read-only collision query failed for ${table} (${response.status}).`);
  }
  return JSON.parse(body);
}

function addressKey(row) {
  return [row.street_address, row.city, row.state_code, row.postal_code].map(value => normalizeName(value ?? "")).join("|");
}

async function main() {
  const values = parseArgs(process.argv.slice(2));
  const apiKeysJson = values["api-keys-stdin"] === "true" ? readFileSync(0, "utf8") : null;
  const client = target(apiKeysJson);
  const plan = buildImportPlan(parseCompanyExport(readFileSync(values.source, "utf8")));
  const accepted = plan.rows.filter(row => row.accepted);
  const desiredClients = new Map();
  const desiredBranches = new Map();
  for (const row of accepted) {
    if (!desiredClients.has(row.normalized.stableClientId)) desiredClients.set(row.normalized.stableClientId, row.normalized);
    if (row.normalized.stableBranchId && !desiredBranches.has(row.normalized.stableBranchId)) desiredBranches.set(row.normalized.stableBranchId, row.normalized);
  }

  const [clients, branches, aliases, identities] = await Promise.all([
    rest(client, "clients", "id,stable_client_id,display_name,normalized_name"),
    rest(client, "branches", "id,client_id,stable_branch_id,street_address,city,state_code,postal_code"),
    rest(client, "client_aliases", "client_id,source_system,external_id,normalized_alias"),
    rest(client, "client_location_source_identities", "branch_id,client_id,source_system,external_client_id,external_address_id"),
  ]);

  const desiredClientIds = new Set(desiredClients.keys());
  const desiredBranchIds = new Set(desiredBranches.keys());
  const desiredExternalClients = new Set([...desiredClients.values()].map(row => row.entityId));
  const desiredExternalAddresses = new Set([...desiredBranches.values()].map(row => `${row.entityId}|${row.addressId}`));
  const desiredNames = new Map([...desiredClients.values()].map(row => [row.normalizedName, row.stableClientId]));
  const desiredAddresses = new Map([...desiredBranches.values()].map(row => [addressKey({street_address:row.streetAddress,city:row.city,state_code:row.stateCode,postal_code:row.postalCode}), row.stableBranchId]));

  const stableClientMatches = clients.filter(row => desiredClientIds.has(row.stable_client_id));
  const stableBranchMatches = branches.filter(row => desiredBranchIds.has(row.stable_branch_id));
  const externalClientMatches = aliases.filter(row => row.source_system === SOURCE_SYSTEM && desiredExternalClients.has(row.external_id));
  const externalAddressMatches = identities.filter(row => row.source_system === SOURCE_SYSTEM && desiredExternalAddresses.has(`${row.external_client_id}|${row.external_address_id}`));
  const nameCollisions = clients.filter(row => desiredNames.has(row.normalized_name) && desiredNames.get(row.normalized_name) !== row.stable_client_id);
  const addressCollisions = branches.filter(row => desiredAddresses.has(addressKey(row)) && desiredAddresses.get(addressKey(row)) !== row.stable_branch_id);
  const syntheticIdentityConflicts = [...stableClientMatches, ...stableBranchMatches].filter(row => !String(row.stable_client_id ?? row.stable_branch_id).startsWith("totalscope-company:"));

  console.log(JSON.stringify({
    targetProjectRef: EXPECTED_PROJECT_REF,
    source: plan.summary,
    hostedInventory: { clients: clients.length, branches: branches.length, aliases: aliases.length, sourceLocationIdentities: identities.length },
    collisions: {
      matchingStableClientIds: stableClientMatches.length,
      matchingStableBranchIds: stableBranchMatches.length,
      matchingExternalClientIds: externalClientMatches.length,
      matchingExternalAddressIds: externalAddressMatches.length,
      normalizedNameCollisions: nameCollisions.length,
      normalizedAddressCollisions: addressCollisions.length,
      syntheticIdentityConflicts: syntheticIdentityConflicts.length,
    },
    clean: [stableClientMatches, stableBranchMatches, externalClientMatches, externalAddressMatches, nameCollisions, addressCollisions, syntheticIdentityConflicts].every(rows => rows.length === 0),
    privacy: "aggregate_only",
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
