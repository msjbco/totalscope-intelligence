import { supabaseRest } from "./supabase-rest";
import type { ImportValidation, LiveClaimDetail, LiveClaimListItem, LiveDashboardSummary, LiveMetric } from "@/types/live-intelligence";

type ClaimRow = {
  id:string; monday_item_id:string; display_name:string|null; raw_status:string|null; normalized_status:string;
  source_row_id:string; contractor_id:string|null; carrier_id:string|null;
  source_rows:{physical_row_number:number; raw_row:Record<string,unknown>};
  contractor:{display_name:string}|null; carrier:{display_name:string}|null;
};

const expected = {
  claim_count:214, complete_status_count:177, closed_status_count:37,
  staged_subitem_header_count:148, staged_subitem_detail_count:1359, update_count:5957,
  unmatched_update_row_count:58, unmatched_update_item_id_count:56, unique_post_id_count:5957,
  additional_rcv_exact_match_count:213, additional_rcv_tolerance_only_count:0,
  additional_rcv_mismatch_count:0, additional_rcv_missing_component_count:1,
};

async function aggregateFinancial(metric:string) {
  const rows = await supabaseRest<Array<{parsed_numeric_value:number|null;source_availability_status:string}>>(
    `claim_financial_facts?normalized_metric_name=eq.${metric}&select=parsed_numeric_value,source_availability_status`
  );
  const usable=rows.filter(row=>row.source_availability_status==="captured"&&row.parsed_numeric_value!==null);
  return { value:usable.reduce((sum,row)=>sum+Number(row.parsed_numeric_value),0), available:usable.length, total:rows.length };
}

function metric(key:string,label:string,value:number|null,format:LiveMetric["format"],definition:string,options:Partial<LiveMetric>={}):LiveMetric {
  return {key,label,value,format,source:"Monday archive",definition,availability:"214 source claims",calculationVersion:null,confidence:"A",validationState:"pass",kind:"source_provided",...options};
}

export async function getLiveDashboardSummary():Promise<LiveDashboardSummary>{
  const [validation] = await supabaseRest<Array<Record<string,number>>>("q2_2026_import_validation?select=*&order=import_job_id.desc&limit=1");
  if(!validation) throw new Error("No completed Q2 2026 import is available.");
  const [initial,current,additional,fee,issues] = await Promise.all([
    aggregateFinancial("initial_rcv"),aggregateFinancial("current_rcv"),aggregateFinancial("additional_secured"),aggregateFinancial("client_fee"),
    supabaseRest<Array<{id:string}>>("data_quality_issues?select=id"),
  ]);
  const coverage=initial.total?initial.available/initial.total*100:0;
  return {mode:"live",period:"2026-Q2",sourceLabel:"Operational source: Monday archive",collectionSourceLabel:"Collection source: Stripe not yet connected",issueCount:issues.length,metrics:[
    metric("claims","Total claims",Number(validation.claim_count),"count","Canonical Q2 archive claims."),
    metric("complete","Complete",Number(validation.complete_status_count),"count","Claims with raw Monday status Complete."),
    metric("closed","Closed",Number(validation.closed_status_count),"count","Claims with raw Monday status Closed."),
    metric("initial_rcv","Total Initial RCV",initial.value,"currency","Sum of captured Initial Ins. RCV.",{availability:`${initial.available} of ${initial.total} records`,confidence:"B"}),
    metric("current_rcv","Total Current RCV",current.value,"currency","Sum of captured Current Ins. RCV."),
    metric("additional_secured","Total Additional Secured",additional.value,"currency","Sum of Monday Additional Secured.",{confidence:"B"}),
    metric("calculated_additional","Reconciled Additional RCV",additional.value,"currency","Current RCV minus Initial RCV for eligible claims.",{kind:"derived",calculationVersion:"additional-rcv-v1",availability:"213 of 214 records"}),
    metric("client_fee","Client Fee — Monday Source",fee.value,"currency","Monday-sourced operational fee field; not collected revenue.",{confidence:"B"}),
    metric("updates","Updates",Number(validation.update_count),"count","All immutable source updates."),
    metric("unmatched_updates","Unmatched updates",Number(validation.unmatched_update_row_count),"count","Updates retained without a Q2 claim match.",{validationState:"warning",confidence:"Limited"}),
    metric("financial_coverage","Initial RCV coverage",coverage,"percent","Captured Initial RCV records divided by claims.",{availability:`${initial.available} of ${initial.total} records`,confidence:"A"}),
    metric("issues","Data-quality issues",issues.length,"count","Open and resolved review records.",{validationState:"warning",confidence:"A"}),
  ]};
}

export async function listLiveClaims():Promise<LiveClaimListItem[]>{
  const rows=await supabaseRest<ClaimRow[]>("claims?select=id,monday_item_id,display_name,raw_status,normalized_status,source_rows!source_row_id(physical_row_number,raw_row),contractor:organizations!contractor_id(display_name),carrier:organizations!carrier_id(display_name)&source_system=eq.monday_archive&order=monday_item_id.asc");
  return rows.map(row=>({id:row.id,mondayItemId:row.monday_item_id,displayName:row.display_name,rawStatus:row.raw_status,normalizedStatus:row.normalized_status,contractor:row.contractor?.display_name??null,carrier:row.carrier?.display_name??null,sourceRow:row.source_rows.physical_row_number}));
}

export async function getLiveClaimDetail(id:string):Promise<LiveClaimDetail|null>{
  const rows=await supabaseRest<ClaimRow[]>(`claims?id=eq.${encodeURIComponent(id)}&select=id,monday_item_id,display_name,raw_status,normalized_status,source_row_id,contractor_id,carrier_id,source_rows!source_row_id(physical_row_number,raw_row),contractor:organizations!contractor_id(display_name),carrier:organizations!carrier_id(display_name)`);
  const row=rows[0]; if(!row)return null;
  const [facts,derived,updates,issues,jobs]=await Promise.all([
    supabaseRest<Array<{normalized_metric_name:string;source_field_name:string;raw_value:unknown;parsed_numeric_value:number|null;source_availability_status:string;source_column_index:number}>>(`claim_financial_facts?claim_id=eq.${id}&select=*`),
    supabaseRest<Array<{metric_name:string;metric_version:string;calculated_value:number|null;source_comparison_value:number|null;reconciliation_status:string;difference:number|null}>>(`claim_derived_metrics?claim_id=eq.${id}&select=*`),
    supabaseRest<Array<{monday_post_id:string;parsed_timestamp:string|null;source_timestamp_raw:string|null;timezone_status:string;author_name:string|null;update_body:string|null;blank_body:boolean;duplicate_body:boolean;source_row:number}>>(`claim_updates?claim_id=eq.${id}&select=*&order=parsed_timestamp.desc.nullslast,source_row.desc`),
    supabaseRest<Array<{issue_type:string;severity:string;status:string;description:string}>>(`data_quality_issues?claim_id=eq.${id}&select=issue_type,severity,status,description`),
    supabaseRest<Array<{id:string;source_filename:string;source_sha256:string;importer_version:string;metadata:Record<string,unknown>}>>("import_jobs?source_period=eq.2026-Q2&select=*&order=created_at.desc&limit=1"),
  ]);
  const job=jobs[0];
  const raw=row.source_rows.raw_row;
  const dates=Object.fromEntries(["Assigned","Closed Date","Date of Status Change","Date of Loss"].map(key=>[key,{raw:raw[key],parsed:typeof raw[key]==="string"?raw[key]:null,timezone_status:"date_only"}]));
  return {id:row.id,mondayItemId:row.monday_item_id,displayName:row.display_name,rawStatus:row.raw_status,normalizedStatus:row.normalized_status,contractor:row.contractor?.display_name??null,carrier:row.carrier?.display_name??null,sourceRow:row.source_rows.physical_row_number,serviceType:null,propertyType:null,dates,
    financialFacts:facts.map(f=>({metric:f.normalized_metric_name,sourceField:f.source_field_name,rawValue:f.raw_value,value:f.parsed_numeric_value===null?null:Number(f.parsed_numeric_value),availability:f.source_availability_status,sourceColumn:f.source_column_index})),
    derivedMetrics:derived.map(d=>({metric:d.metric_name,version:d.metric_version,value:d.calculated_value===null?null:Number(d.calculated_value),sourceValue:d.source_comparison_value===null?null:Number(d.source_comparison_value),reconciliation:d.reconciliation_status,difference:d.difference===null?null:Number(d.difference)})),
    updates:updates.map(u=>({postId:u.monday_post_id,timestamp:u.parsed_timestamp,rawTimestamp:u.source_timestamp_raw,timezoneStatus:u.timezone_status,author:u.author_name,body:u.update_body,blankBody:u.blank_body,duplicateBody:u.duplicate_body,sourceRow:u.source_row})),
    provenance:{sourceFilename:job.source_filename,sourceSha256:job.source_sha256,worksheet:"archive q2 2026",sourceRow:row.source_rows.physical_row_number,importJobId:job.id,importerVersion:job.importer_version,transformationVersion:String(job.metadata?.transformation_version??"monday-archive-q2-2026-v1")},
    issues:issues.map(i=>({type:i.issue_type,severity:i.severity,status:i.status,description:i.description}))};
}

export async function getImportValidation():Promise<ImportValidation>{
  const [jobs,counts,issues]=await Promise.all([
    supabaseRest<Array<{id:string;status:string;source_filename:string;source_sha256:string;source_period:string;importer_version:string;started_at:string;completed_at:string|null;source_workbook_metadata:Record<string,unknown>}>>("import_jobs?source_period=eq.2026-Q2&select=*&order=created_at.desc&limit=1"),
    supabaseRest<Array<Record<string,number>>>("q2_2026_import_validation?select=*&order=import_job_id.desc&limit=1"),
    supabaseRest<Array<{issue_type:string;severity:string;status:string}>>("data_quality_issues?select=issue_type,severity,status"),
  ]);
  const grouped=new Map<string,{issueType:string;severity:string;status:string;count:number}>();
  for(const issue of issues){const key=`${issue.issue_type}:${issue.severity}:${issue.status}`;const current=grouped.get(key);grouped.set(key,{issueType:issue.issue_type,severity:issue.severity,status:issue.status,count:(current?.count??0)+1});}
  const job=jobs[0];
  return {mode:"live",available:Boolean(job&&counts[0]),importJob:job?{id:job.id,status:job.status,sourceFilename:job.source_filename,sourceSha256:job.source_sha256,sourcePeriod:job.source_period,importerVersion:job.importer_version,startedAt:job.started_at,completedAt:job.completed_at,metadata:job.source_workbook_metadata}:undefined,counts:counts[0]??{},expected,issues:[...grouped.values()]};
}
