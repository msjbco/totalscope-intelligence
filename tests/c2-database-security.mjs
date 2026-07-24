import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!serviceKey||!anonKey)throw new Error("Database security test requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and NEXT_PUBLIC_SUPABASE_ANON_KEY.");

const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const browser=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`c2-security-${Date.now()}@example.invalid`;
const password=`C2-test-${crypto.randomUUID()}!`;
let userId;

try{
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

  const elevate=await browser.from("application_profiles").update({role:"staging_admin"}).eq("user_id",userId);
  assert.ok(elevate.error,"viewer must not mutate its role");

  const promoted=await service.from("application_profiles").update({role:"staging_admin"}).eq("user_id",userId);
  assert.ifError(promoted.error);

  const validationAllowed=await browser.from("q2_2026_import_validation").select("claim_count").limit(1);
  assert.ifError(validationAllowed.error);
  assert.equal(Number(validationAllowed.data?.[0]?.claim_count),214);

  console.log("C2 database security probe passed.");
}finally{
  if(userId)await service.auth.admin.deleteUser(userId);
}
