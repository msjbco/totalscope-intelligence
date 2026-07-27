import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  throw new Error("C3 security probe requires local Supabase URL, service-role key, and anon key.");
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, options);
const viewer = createClient(url, anonKey, options);
const anonymous = createClient(url, anonKey, options);
const email = `c3-security-${Date.now()}@example.invalid`;
const password = `C3-local-${crypto.randomUUID()}!`;
let userId;

try {
  const anonymousFiles = await anonymous.from("c3_operations_files").select("id").limit(1);
  assert.ok(anonymousFiles.error, "anonymous callers must not access protected C3 views");

  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  const signedIn = await viewer.auth.signInWithPassword({ email, password });
  assert.ifError(signedIn.error);

  const approvedFiles = await viewer.from("c3_operations_files").select("id,stable_file_id,approved_charge_minor");
  assert.ifError(approvedFiles.error);
  assert.equal(approvedFiles.data?.length, 6);

  const handlerInputs = await viewer.from("c3_handler_performance_inputs").select("handler_id,operational_file_id");
  assert.ifError(handlerInputs.error);

  const rawPaymentId = await viewer.from("payment_events").select("stable_payment_id").limit(1);
  assert.ok(rawPaymentId.error, "viewer must not select processor-facing payment identifiers");
  const permittedPaymentColumns = await viewer.from("payment_events").select("amount_minor").limit(1);
  assert.ifError(permittedPaymentColumns.error);
  assert.equal(permittedPaymentColumns.data?.length, 0, "viewer RLS must hide payment rows");

  const viewerHealth = await viewer.from("c3_data_health").select("*");
  assert.ifError(viewerHealth.error);
  assert.equal(viewerHealth.data?.length, 0, "viewer must not see administrator Data Health rows");

  const elevate = await viewer.from("application_profiles").update({ role: "staging_admin" }).eq("user_id", userId);
  assert.ok(elevate.error, "viewer must not elevate its own role");
  const promoted = await service.from("application_profiles").update({ role: "staging_admin" }).eq("user_id", userId);
  assert.ifError(promoted.error);

  const adminHealth = await viewer.from("c3_data_health").select("ingestion_run_id,status,open_issue_count");
  assert.ifError(adminHealth.error);
  assert.equal(adminHealth.data?.length, 2);
  const adminPayments = await viewer.from("payment_events").select("amount_minor,status");
  assert.ifError(adminPayments.error);
  assert.equal(adminPayments.data?.length, 4);
  const stillRestricted = await viewer.from("payment_events").select("stable_payment_id").limit(1);
  assert.ok(stillRestricted.error, "administrator interface must still hide payment identifiers");

  const serviceRaw = await service.from("payment_events").select("stable_payment_id");
  assert.ifError(serviceRaw.error);
  assert.equal(serviceRaw.data?.length, 4);

  console.log("C3 database security probe passed.");
} finally {
  if (userId) await service.auth.admin.deleteUser(userId);
}
