import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!serviceKey||!anonKey)throw new Error("Database security test requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and NEXT_PUBLIC_SUPABASE_ANON_KEY.");

const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const browser=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const anonymous=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`c2-security-${Date.now()}@example.invalid`;
const password=`C2-test-${crypto.randomUUID()}!`;
let userId;

try{
  const anonymousValidation=await anonymous.rpc("get_q2_2026_import_validation");
  assert.ok(anonymousValidation.error,"anonymous caller must not invoke admin validation");

  const created=await service.auth.admin.createUser({email,password,email_confirm:true});
  assert.ifError(created.error);
  userId=created.data.user.id;

  const signedIn=await browser.auth.signInWithPassword({email,password});
  assert.ifError(signedIn.error);

  const approved=await browser.from("claims").select("id,monday_item_id").limit(1);
  assert.ifError(approved.error);
  assert.equal(approved.data?.length,1);

  const raw=await browser.from("source_rows").select("raw_row").limit(1);
  assert.ok(raw.error,"viewer must not read raw source columns");

  const validationDenied=await browser.from("q2_2026_import_validation").select("*").limit(1);
  assert.ok(validationDenied.error,"viewer must not read admin validation");

  const rpcDenied=await browser.rpc("get_q2_2026_import_validation");
  assert.ok(rpcDenied.error,"viewer must not invoke admin validation RPC");

  const elevate=await browser.from("application_profiles").update({role:"staging_admin"}).eq("user_id",userId);
  assert.ok(elevate.error,"viewer must not mutate its role");

  const promoted=await service.from("application_profiles").update({role:"staging_admin"}).eq("user_id",userId);
  assert.ifError(promoted.error);

  const validationAllowed=await browser.rpc("get_q2_2026_import_validation");
  assert.ifError(validationAllowed.error);
  const summary=validationAllowed.data?.[0];
  assert.deepEqual(Object.keys(summary??{}).sort(),[
    "additional_rcv_exact_match_count","additional_rcv_mismatch_count",
    "additional_rcv_missing_component_count","additional_rcv_tolerance_only_count",
    "claim_count","closed_status_count","complete_status_count","import_job_id",
    "import_status","staged_subitem_detail_count","staged_subitem_header_count",
    "unique_post_id_count","unmatched_update_item_id_count","unmatched_update_row_count",
    "update_count",
  ]);
  assert.equal(Number(summary?.claim_count),214);
  assert.equal(Number(summary?.update_count),5957);

  const restrictedAfterPromotion=await browser.from("claim_updates").select("unmatched_source,referenced_monday_item_id").limit(1);
  assert.ok(restrictedAfterPromotion.error,"admin RPC must not broaden direct restricted update access");

  console.log("C2 database security probe passed.");
}finally{
  if(userId)await service.auth.admin.deleteUser(userId);
}
