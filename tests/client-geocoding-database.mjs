import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!serviceKey||!anonKey)throw new Error("Geocoding database probe requires local Supabase credentials");
if(!/127\.0\.0\.1|localhost/.test(new URL(url).hostname))throw new Error("Geocoding database probe is local-only");
const imported=spawnSync(process.execPath,["scripts/client-data/import-company-export.mjs","import","--source","tests/fixtures/client-data/company-export-v1.csv","--confirm-target","local"],{encoding:"utf8",env:{...process.env,TOTALSCOPE_IMPORT_TARGET:"local",TOTALSCOPE_CLIENT_STATUS_MAPPING_JSON:JSON.stringify({A:"current",I:"inactive",D:"inactive"})}});assert.equal(imported.status,0,imported.stderr);
const options={auth:{persistSession:false,autoRefreshToken:false}},service=createClient(url,serviceKey,options),browser=createClient(url,anonKey,options);
const branches=await service.from("branches").select("id,client_id").eq("restricted_master_data",true);assert.ifError(branches.error);assert.ok(branches.data.length>=2);
const owned=branches.data[0],other=branches.data.find(row=>row.client_id!==owned.client_id);assert.ok(other,"fixture must contain a branch owned by another client");const hash=createHash("sha256").update(randomUUID()).digest("hex");
const inserted=await service.from("client_location_geocode_attempts").insert({client_id:owned.client_id,branch_id:owned.id,address_fingerprint:hash,request_fingerprint:hash,provider:"geocodio",provider_version:"v2",latitude:32.8,longitude:-96.8,provider_precision:"rooftop",canonical_precision:"rooftop",confidence:.99,component_match_metadata:{},state_matches:true,postal_code_matches:true,result_status:"matched",review_status:"auto_accepted",review_reason:"probe",raw_provider_payload:{probe:true},source_provenance:{probe:true}}).select("id").single();assert.ifError(inserted.error);
const email=`geocode-security-${Date.now()}@example.invalid`,password=`Geocode-${randomUUID()}!`;let userId;
try{
  const created=await service.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);userId=created.data.user.id;assert.ifError((await browser.auth.signInWithPassword({email,password})).error);
  const viewerRead=await browser.from("client_location_geocode_attempts").select("id");assert.ifError(viewerRead.error);assert.equal(viewerRead.data.length,0,"viewer reads no internal attempts");
  const viewerDispositions=await browser.from("client_location_geocode_dispositions").select("id");assert.ifError(viewerDispositions.error);assert.equal(viewerDispositions.data.length,0,"viewer reads no administrator dispositions");
  assert.ok((await browser.from("client_location_geocode_attempts").insert({})).error,"browser cannot insert attempts");
  assert.ok((await browser.from("client_geocoding_trial_samples").insert({})).error,"browser cannot mutate sample ledger");
  assert.ifError((await service.from("application_profiles").update({role:"staging_admin"}).eq("user_id",userId)).error);
  const adminRead=await browser.from("client_location_geocode_attempts").select("id,raw_provider_payload");assert.ifError(adminRead.error);assert.equal(adminRead.data.length,1);
  const disposition=await service.from("client_location_geocode_dispositions").insert({geocode_attempt_id:inserted.data.id,branch_id:owned.id,client_id:owned.client_id,disposition:"unresolved_coordinate",rationale:"Database security probe",decision_source:"automated local probe",decided_at:new Date().toISOString()}).select("id").single();assert.ifError(disposition.error);
  const adminDisposition=await browser.from("client_location_geocode_dispositions").select("id,disposition").eq("id",disposition.data.id);assert.ifError(adminDisposition.error);assert.equal(adminDisposition.data.length,1);
  assert.ok((await service.from("client_location_geocode_dispositions").update({rationale:"changed"}).eq("id",disposition.data.id)).error,"administrator dispositions are immutable");
  const immutable=await service.from("client_location_geocode_attempts").update({review_reason:"changed"}).eq("id",inserted.data.id);assert.ok(immutable.error,"attempt evidence is immutable (service role has no update grant and a trigger protects privileged SQL)");
  const inconsistent=await service.from("client_location_geocode_attempts").insert({client_id:other.client_id,branch_id:owned.id,address_fingerprint:createHash("sha256").update("a").digest("hex"),request_fingerprint:createHash("sha256").update("b").digest("hex"),provider:"geocodio",provider_version:"v2",canonical_precision:"unknown",result_status:"not_found",review_status:"rejected",review_reason:"probe"});assert.equal(inconsistent.error?.code,"23503","PostgreSQL enforces branch/client ownership");
  const wrongPointer=await service.from("branches").update({accepted_geocode_attempt_id:inserted.data.id}).eq("id",other.id);assert.equal(wrongPointer.error?.code,"23503","accepted attempt pointer enforces branch/client ownership");
  assert.ifError((await service.from("branches").update({accepted_geocode_attempt_id:inserted.data.id}).eq("id",owned.id)).error);
  console.log(JSON.stringify({passed:true,viewerDenied:true,adminRead:true,browserMutationDenied:true,immutable:true,ownershipEnforced:true}));
}finally{if(userId)await service.auth.admin.deleteUser(userId);}
