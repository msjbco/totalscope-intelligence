import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const REF = "ygeahqczlrwaadvlsiew";
const values = Object.fromEntries(process.argv.slice(2).flatMap((value, index, all) => value.startsWith("--") ? [[value.slice(2), all[index + 1]]] : []));
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || new URL(url).hostname.split(".")[0] !== REF || !values.source) {
  throw new Error("Exact staging credentials and an ignored local --source decision file are required");
}

const allowed = new Set([
  "accepted_governed_coordinate", "unresolved_coordinate", "source_verification_required",
  "administrative_data_review", "source_data_correction_required", "rejected_po_box",
]);
const decisions = JSON.parse(readFileSync(values.source, "utf8"));
if (!Array.isArray(decisions) || decisions.length === 0) throw new Error("Decision file must contain a non-empty array");
for (const decision of decisions) {
  if (!decision.clientName || !allowed.has(decision.disposition) || !decision.rationale) throw new Error("Decision entry is invalid");
}
if (new Set(decisions.map((decision) => decision.clientName)).size !== decisions.length) throw new Error("Decision client names must be unique");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const clients = await db.from("clients").select("id,display_name").in("display_name", decisions.map((decision) => decision.clientName));
if (clients.error) throw clients.error;
const clientByName = new Map(clients.data.map((row) => [row.display_name, row.id]));
const attempts = await db.from("client_location_geocode_attempts").select("id,branch_id,client_id").eq("provider_version", "v2-normalizer-2").in("client_id", clients.data.map((row) => row.id));
if (attempts.error) throw attempts.error;

let created = 0;
let reused = 0;
for (const decision of decisions) {
  const clientId = clientByName.get(decision.clientName);
  const attempt = attempts.data.find((row) => row.client_id === clientId);
  if (!attempt) throw new Error("A governed attempt is missing for one decision entry");
  const existing = await db.from("client_location_geocode_dispositions").select("disposition,rationale").eq("geocode_attempt_id", attempt.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    if (existing.data.disposition !== decision.disposition || existing.data.rationale !== decision.rationale) throw new Error("Immutable disposition conflict");
    reused++;
    continue;
  }
  const insert = await db.from("client_location_geocode_dispositions").insert({
    geocode_attempt_id: attempt.id,
    branch_id: attempt.branch_id,
    client_id: attempt.client_id,
    disposition: decision.disposition,
    rationale: decision.rationale,
    decision_source: decision.decisionSource ?? "TotalScope administrator approval gate",
    decided_at: decision.decidedAt,
  });
  if (insert.error) throw insert.error;
  created++;
}
console.log(JSON.stringify({ created, reused, total: decisions.length, providerCalls: 0 }));
