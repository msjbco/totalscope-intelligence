import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF="ygeahqczlrwaadvlsiew",url=`https://${PROJECT_REF}.supabase.co`;
if(process.argv[2]!==PROJECT_REF||process.argv[3]!=="--api-keys-stdin")throw new Error("Hosted client probe requires the exact staging project and in-memory API keys.");
const keys=JSON.parse(readFileSync(0,"utf8")),serviceKey=keys.find(item=>item.id==="service_role")?.api_key,anonKey=keys.find(item=>item.id==="anon")?.api_key;
if(!serviceKey||!anonKey)throw new Error("Required staging API keys were unavailable.");
const options={auth:{persistSession:false,autoRefreshToken:false}},service=createClient(url,serviceKey,options),browser=createClient(url,anonKey,options);
const marker=`client-security-${Date.now()}`,email=`${marker}@example.invalid`,password=`Client-stage-${crypto.randomUUID()}!`;
let userId;
const exact=async(query,label)=>{const result=await query;assert.ifError(result.error);assert.notEqual(result.count,null,`${label} count unavailable`);return result.count;};

try{
  const created=await service.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);userId=created.data.user.id;
  assert.ifError((await browser.auth.signInWithPassword({email,password})).error);
  assert.equal(await exact(browser.from("clients").select("id",{count:"exact",head:true}).eq("restricted_master_data",true),"viewer clients"),0);
  assert.equal(await exact(browser.from("branches").select("id",{count:"exact",head:true}).eq("restricted_master_data",true),"viewer branches"),0);
  assert.ok((await browser.from("client_contact_relationships").select("id").limit(1)).error,"viewer contacts must be denied");
  assert.ok((await browser.rpc("get_weather_internal_client_locations_v2")).error,"viewer Weather inventory RPC must be denied");
  assert.ok((await browser.from("clients").update({display_name:"forbidden"}).eq("restricted_master_data",true)).error,"viewer client mutation must be denied");
  assert.ok((await browser.from("branches").update({city:"forbidden"}).eq("restricted_master_data",true)).error,"viewer branch mutation must be denied");
  assert.ok((await browser.from("application_profiles").update({role:"staging_admin"}).eq("user_id",userId)).error,"viewer self-elevation must be denied");

  assert.ifError((await service.from("application_profiles").update({role:"staging_admin"}).eq("user_id",userId)).error);
  const restrictedClients=await exact(browser.from("clients").select("id",{count:"exact",head:true}).eq("restricted_master_data",true),"admin clients");
  const restrictedBranches=await exact(browser.from("branches").select("id",{count:"exact",head:true}).eq("restricted_master_data",true),"admin branches");
  assert.equal(restrictedClients,804);assert.equal(restrictedBranches,863);
  const profileClient=await browser.from("clients").select("id,display_name,lifecycle_status,source_status_code").eq("restricted_master_data",true).limit(1).single();assert.ifError(profileClient.error);
  const profileBranches=await browser.from("branches").select("id,client_id,display_name,street_address,city,state_code,postal_code,location_precision,geocoding_status").eq("client_id",profileClient.data.id);assert.ifError(profileBranches.error);assert.ok(profileBranches.data.length>0,"canonical client profile must resolve its governed locations");
  const missingProfile=await browser.from("clients").select("id").eq("id",crypto.randomUUID()).maybeSingle();assert.ifError(missingProfile.error);assert.equal(missingProfile.data,null,"unknown canonical client IDs must resolve safely to no row");
  const statuses={};for(const code of ["A","I","D"]){statuses[code]=await exact(browser.from("clients").select("id",{count:"exact",head:true}).eq("restricted_master_data",true).eq("source_status_code",code),`status ${code}`);}
  assert.deepEqual(statuses,{A:651,I:73,D:80});
  const locations=await browser.rpc("get_weather_internal_client_locations_v2");assert.ifError(locations.error);assert.equal(locations.data.length,0,"ungeocoded real client master must not claim Weather exposure");
  const identities=await exact(service.from("client_location_source_identities").select("id",{count:"exact",head:true}).eq("source_system","totalscope_company_export"),"location identities");
  const contacts=await exact(service.from("client_contact_relationships").select("id",{count:"exact",head:true}).eq("source_system","totalscope_company_export"),"contact relationships");
  const people=await exact(service.from("operational_people").select("id",{count:"exact",head:true}).like("stable_user_id","totalscope-company-user:%"),"people");
  const aliases=await exact(service.from("client_aliases").select("id",{count:"exact",head:true}).eq("source_system","totalscope_company_export"),"client aliases");
  const ungeocoded=await exact(service.from("branches").select("id",{count:"exact",head:true}).eq("restricted_master_data",true).eq("geocoding_status","not_configured").is("latitude",null).is("longitude",null),"ungeocoded branches");
  assert.equal(identities,863);assert.equal(contacts,692);assert.equal(people,671);assert.equal(aliases,804);assert.equal(ungeocoded,863);
  const run=await service.from("ingestion_runs").select("id,status,source_record_count,accepted_record_count,quarantined_record_count,warning_count").eq("source_system","totalscope_company_export").single();assert.ifError(run.error);assert.equal(run.data.status,"completed");assert.deepEqual({source:run.data.source_record_count,accepted:run.data.accepted_record_count,quarantined:run.data.quarantined_record_count,warnings:run.data.warning_count},{source:864,accepted:863,quarantined:1,warnings:2});
  const lineage=await exact(service.from("canonical_field_lineage").select("id",{count:"exact",head:true}).eq("ingestion_run_id",run.data.id),"field lineage");
  assert.equal(lineage,7339);
  console.log(JSON.stringify({passed:true,projectRef:PROJECT_REF,restrictedClients,restrictedBranches,statuses,identities,aliases,people,contacts,lineage,ungeocoded,weatherExposures:0,profileResolution:true,missingProfileSafe:true,importRunStatus:run.data.status,privacy:"aggregate_only"}));
}finally{
  await browser.auth.signOut();
  if(userId)await service.auth.admin.deleteUser(userId);
  const listed=await service.auth.admin.listUsers({page:1,perPage:1000});
  assert.ifError(listed.error);assert.equal(listed.data.users.filter(user=>user.email?.startsWith("client-security-")).length,0,"temporary client probe users must be removed");
}
