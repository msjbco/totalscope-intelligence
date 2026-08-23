import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!serviceKey||!anonKey)throw new Error("Client database probe requires local Supabase URL, service-role key, and anon key.");
if(!/127\.0\.0\.1|localhost/.test(new URL(url).hostname))throw new Error("Client database probe is local-only.");
const fixture="tests/fixtures/client-data/company-export-v1.csv";
const importEnv={...process.env,TOTALSCOPE_IMPORT_TARGET:"local",TOTALSCOPE_CLIENT_STATUS_MAPPING_JSON:JSON.stringify({A:"current",I:"inactive",D:"inactive"})};
function runImport(){const result=spawnSync(process.execPath,["scripts/client-data/import-company-export.mjs","import","--source",fixture,"--confirm-target","local"],{env:importEnv,encoding:"utf8"});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);}

const first=runImport();
assert.equal(first.idempotent,false);
assert.deepEqual(first.summary.clients,{created:2,updated:0,unchanged:0});
assert.deepEqual(first.summary.locations,{created:3,updated:0,unchanged:0});
const second=runImport();
assert.equal(second.idempotent,true,"identical repeat must reuse completed ingestion run");
assert.equal(second.runId,first.runId);

const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,serviceKey,options),viewer=createClient(url,anonKey,options);
const email=`client-security-${Date.now()}@example.invalid`,password=`Client-local-${crypto.randomUUID()}!`;
let userId;
try{
  const created=await service.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);userId=created.data.user.id;
  assert.ifError((await viewer.auth.signInWithPassword({email,password})).error);
  const viewerClients=await viewer.from("clients").select("id").eq("restricted_master_data",true);assert.ifError(viewerClients.error);assert.equal(viewerClients.data.length,0);
  assert.ok((await viewer.from("client_contact_relationships").select("id").limit(1)).error,"contacts remain service-role-only");
  assert.ok((await viewer.rpc("get_weather_internal_client_locations_v2")).error,"viewer cannot retrieve TotalScope-wide client geography");
  assert.ok((await viewer.from("branches").update({city:"Changed"}).eq("restricted_master_data",true)).error,"browser cannot mutate client locations");
  assert.ifError((await service.from("application_profiles").update({role:"staging_admin"}).eq("user_id",userId)).error);
  const adminClients=await viewer.from("clients").select("id,lifecycle_status").eq("restricted_master_data",true);assert.ifError(adminClients.error);assert.equal(adminClients.data.length,2);
  const identities=await service.from("client_location_source_identities").select("branch_id,client_id");assert.ifError(identities.error);assert.equal(identities.data.length,3);
  const cross=identities.data.find((candidate)=>candidate.client_id!==identities.data[0].client_id);assert.ok(cross);
  const inconsistent=await service.from("client_location_source_identities").insert({branch_id:identities.data[0].branch_id,client_id:cross.client_id,source_system:"ownership-probe",external_client_id:"wrong",external_address_id:"wrong",first_ingestion_run_id:first.runId,last_ingestion_run_id:first.runId,ingestion_record_id:(await service.from("ingestion_records").select("id").eq("ingestion_run_id",first.runId).limit(1).single()).data.id});
  assert.equal(inconsistent.error?.code,"23503","PostgreSQL enforces branch/client ownership");
  const current=adminClients.data.find((client)=>client.lifecycle_status==="current");
  const currentBranch=(await service.from("branches").select("id").eq("client_id",current.id).limit(1).single()).data;
  assert.ifError((await service.from("branches").update({latitude:32.7767,longitude:-96.797,location_precision:"rooftop",geocoding_status:"matched",geocoding_provider:"synthetic-test"}).eq("id",currentBranch.id)).error);
  const internalLocations=await viewer.rpc("get_weather_internal_client_locations_v2");assert.ifError(internalLocations.error);assert.equal(internalLocations.data.length,1);assert.equal(internalLocations.data[0].location_precision,"rooftop");
  const lineage=await service.from("canonical_field_lineage").select("id",{count:"exact",head:true}).eq("ingestion_run_id",first.runId);assert.ifError(lineage.error);assert.ok(lineage.count>=17);
  console.log(JSON.stringify({passed:true,firstRun:first.runId,idempotentRun:second.runId,clients:2,locations:3,lineage:lineage.count}));
}finally{if(userId)await service.auth.admin.deleteUser(userId);}
