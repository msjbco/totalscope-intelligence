import { createHash } from "node:crypto";

export const REQUIRED_HEADERS = ["entity_id","entity","email","mobilephone","activestatus","address_id","streetnumber","streetname","city","state","zip","user_id","namefirst","namelast","role_id","datetimecreated"];
export const AUTHORITATIVE_STATUS_MAPPING = Object.freeze({ A:"current", I:"inactive", D:"inactive" });
const US_STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" "));

export function parseCsv(text) {
  const rows=[]; let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i+=1){const char=text[i];if(quoted){if(char==='"'&&text[i+1]==='"'){field+='"';i+=1;}else if(char==='"')quoted=false;else field+=char;}else if(char==='"')quoted=true;else if(char===","){row.push(field);field="";}else if(char==="\n"){row.push(field.replace(/\r$/, ""));rows.push(row);row=[];field="";}else field+=char;}
  if(field.length||row.length){row.push(field.replace(/\r$/, ""));rows.push(row);} if(quoted)throw new Error("CSV ended inside a quoted field."); return rows;
}

export function parseCompanyExport(text){const parsed=parseCsv(text);const headers=parsed.shift()?.map(v=>v.trim().toLowerCase())??[];if(JSON.stringify(headers)!==JSON.stringify(REQUIRED_HEADERS))throw new Error(`Unexpected CSV schema: ${headers.join(",")}`);return parsed.filter(r=>r.some(v=>v.trim()!=="")).map((row,index)=>{if(row.length!==headers.length)throw new Error(`Row ${index+2} has ${row.length} columns; expected ${headers.length}.`);return Object.fromEntries(headers.map((h,i)=>[h,row[i].trim()]));});}
export const normalizeName=(value)=>(value??"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
export const normalizeEmail=(value)=>value.trim().toLowerCase();
export const normalizePhone=(value)=>value.replace(/\D/g,"").replace(/^1(?=\d{10}$)/,"");
export function canonicalBranchNormalizedName(row,requiresDisambiguation=false){const base=normalizeName(row.streetAddress||`${row.city||"unknown"} location`);return requiresDisambiguation?`${base} source address ${normalizeName(row.addressId)}`:base;}
export const rowFingerprint=(row)=>createHash("sha256").update(JSON.stringify(row)).digest("hex");
const validEmail=(v)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validZip=(v)=>/^\d{5}(?:-\d{4})?$/.test(v);
const validDateTime=(value)=>!value||!Number.isNaN(Date.parse(value));

export function normalizeCompanyRow(row,rowNumber,statusMapping=AUTHORITATIVE_STATUS_MAPPING){
  const issues=[]; const state=row.state.toUpperCase(); const email=normalizeEmail(row.email); const phone=normalizePhone(row.mobilephone);
  if(!row.entity_id)issues.push({code:"missing_entity_id",severity:"error"});
  if(!row.entity)issues.push({code:"missing_company_name",severity:"error"});
  if(!row.address_id)issues.push({code:"missing_address_id",severity:"warning"});
  if(row.user_id&&![row.namefirst,row.namelast].some(Boolean))issues.push({code:"missing_contact_name",severity:"warning"});
  if(row.email&&!validEmail(email))issues.push({code:"malformed_email",severity:"warning"});
  if(row.mobilephone&&phone.length!==10)issues.push({code:"malformed_phone",severity:"warning"});
  if(row.state&&!US_STATES.has(state))issues.push({code:"malformed_state",severity:"warning"});
  if(row.zip&&!validZip(row.zip))issues.push({code:"malformed_zip",severity:"warning"});
  if(!validDateTime(row.datetimecreated))issues.push({code:"malformed_source_created_at",severity:"warning"});
  const lifecycleStatus=statusMapping[row.activestatus]??"unknown";
  if(lifecycleStatus==="unknown")issues.push({code:"unknown_status_code",severity:"warning"});
  const accepted=!issues.some(i=>i.severity==="error");
  return {rowNumber,accepted,issues,source:row,normalized:{
    entityId:row.entity_id||null,addressId:row.address_id||null,userId:row.user_id||null,
    stableClientId:row.entity_id?`totalscope-company:${row.entity_id}`:null,
    stableBranchId:row.entity_id&&row.address_id?`totalscope-company:${row.entity_id}:address:${row.address_id}`:null,
    stableUserId:row.user_id?`totalscope-company-user:${row.user_id}`:null,
    displayName:row.entity||null,normalizedName:normalizeName(row.entity),companyEmail:validEmail(email)?email:null,companyPhone:phone.length===10?phone:null,
    sourceStatusCode:row.activestatus||null,lifecycleStatus,active:lifecycleStatus==="current",
    streetAddress:[row.streetnumber,row.streetname].filter(Boolean).join(" ")||null,city:row.city||null,stateCode:US_STATES.has(state)?state:null,postalCode:validZip(row.zip)?row.zip:null,
    contactDisplayName:[row.namefirst,row.namelast].filter(Boolean).join(" ")||null,roleCode:row.role_id||null,sourceCreatedAt:validDateTime(row.datetimecreated)?row.datetimecreated||null:null,
    locationPrecision:"unknown",geographyQuality:state&&validZip(row.zip)?"not_captured":"invalid"
  }};
}

export function buildImportPlan(records,statusMapping=AUTHORITATIVE_STATUS_MAPPING){
  const normalized=records.map((row,index)=>normalizeCompanyRow(row,index+2,statusMapping)); const accepted=normalized.filter(r=>r.accepted); const unique=(selector)=>new Set(accepted.map(selector).filter(Boolean)).size;
  return {rows:normalized,summary:{sourceRows:normalized.length,acceptedRows:accepted.length,quarantinedRows:normalized.length-accepted.length,warningRows:normalized.filter(r=>r.issues.some(i=>i.severity==="warning")).length,clients:unique(r=>r.normalized.stableClientId),locations:unique(r=>r.normalized.stableBranchId),people:unique(r=>r.normalized.stableUserId),clientContacts:unique(r=>r.normalized.entityId&&r.normalized.userId?`${r.normalized.entityId}|${r.normalized.userId}`:null),unknownStatusRows:normalized.filter(r=>r.normalized.lifecycleStatus==="unknown").length}};
}
