import type { Carrier, Claim, Contractor, KpiMetadata, MetricResult } from "@/types/intelligence";

const usable=(c:Claim)=>c.financialStatus==="captured"||c.financialStatus==="partially_captured";
const confidence=(coverage:number):KpiMetadata["confidence"]=>coverage>=90?"A":coverage>=75?"B":coverage>=50?"C":"D";
function metric(value:number|null,numerator:number|null,denominator:number,explanation:string,status:KpiMetadata["status"]="measured",drillDown:KpiMetadata["drillDown"]={}):MetricResult{
 const coveragePercent=denominator?Math.round(((numerator??0)/denominator)*100):0;
 return {value,metadata:{numerator,denominator,coveragePercent,confidence:confidence(coveragePercent),status:value===null?"unavailable":status,explanation,drillDown}};
}
export const totalFiles=(claims:Claim[])=>metric(claims.length,claims.length,claims.length,"Count of submitted files in the selected period.");
export const estimateOnlyFiles=(claims:Claim[])=>{const n=claims.filter(c=>c.serviceType==="estimate_only").length;return metric(n,n,claims.length,"Files scoped for estimate preparation only.","measured",{serviceType:"estimate_only"})};
export const claimHandlingFiles=(claims:Claim[])=>{const n=claims.filter(c=>c.serviceType==="claim_handling").length;return metric(n,n,claims.length,"Files supported through claim handling.","measured",{serviceType:"claim_handling"})};
export const activeInventory=(claims:Claim[])=>{const n=claims.filter(c=>c.status!=="closed").length;return metric(n,n,claims.length,"Submitted files not yet closed.")};
export const closedFiles=(claims:Claim[])=>{const n=claims.filter(c=>c.status==="closed").length;return metric(n,n,claims.length,"Files with a recorded closed date.")};
function financialValues(claims:Claim[],field:"additionalRcv"|"totalScopeFee"){return claims.filter(usable).map(c=>c[field]).filter((v):v is number=>v!==null&&Number.isFinite(v))}
export const additionalRcv=(claims:Claim[])=>{const v=financialValues(claims,"additionalRcv");return metric(v.length?v.reduce((a,b)=>a+b,0):null,v.length,claims.length,"Sum of additional RCV only where usable financial data is captured.")};
export const averageAdditionalRcv=(claims:Claim[])=>{const v=financialValues(claims,"additionalRcv");return metric(v.length?v.reduce((a,b)=>a+b,0)/v.length:null,v.length,claims.length,"Mean additional RCV across files with usable financial data.")};
export const medianAdditionalRcv=(claims:Claim[])=>{const v=financialValues(claims,"additionalRcv").sort((a,b)=>a-b);const m=v.length?v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2:null;return metric(m,v.length,claims.length,"Median additional RCV across files with usable financial data.")};
export const feeRevenue=(claims:Claim[])=>{const v=financialValues(claims,"totalScopeFee");return metric(v.length?v.reduce((a,b)=>a+b,0):null,v.length,claims.length,"Synthetic TotalScope fee revenue recorded on financially usable files.")};
function cycleDays(c:Claim){return c.closedAt?Math.max(0,Math.round((Date.parse(c.closedAt)-Date.parse(c.openedAt))/86400000)):null}
export const averageCycleTime=(claims:Claim[])=>{const v=claims.map(cycleDays).filter((v):v is number=>v!==null);return metric(v.length?v.reduce((a,b)=>a+b,0)/v.length:null,v.length,claims.length,"Mean days from opened date to closed date.")};
export const medianCycleTime=(claims:Claim[])=>{const v=claims.map(cycleDays).filter((v):v is number=>v!==null).sort((a,b)=>a-b);const m=v.length?v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2:null;return metric(m,v.length,claims.length,"Median days from opened date to closed date.")};
export const financialCoverage=(claims:Claim[])=>{const n=claims.filter(usable).length;return metric(claims.length?n/claims.length*100:null,n,claims.length,"Share of files with captured or partially captured financial data.")};
export function carrierMix(claims:Claim[],carriers:Carrier[]){return carriers.map(carrier=>{const count=claims.filter(c=>c.carrierId===carrier.id).length;return {id:carrier.id,name:carrier.name,count,share:claims.length?count/claims.length*100:0}}).filter(x=>x.count).sort((a,b)=>b.count-a.count)}
export function contractorRankings(claims:Claim[],contractors:Contractor[]){return contractors.map(contractor=>{const rows=claims.filter(c=>c.contractorId===contractor.id);const closed=rows.filter(c=>c.status==="closed").length;const recovery=financialValues(rows,"additionalRcv").reduce((a,b)=>a+b,0);return {id:contractor.id,name:contractor.name,files:rows.length,closed,recovery,closeRate:rows.length?closed/rows.length*100:0}}).filter(x=>x.files).sort((a,b)=>b.recovery-a.recovery)}
export function agingBuckets(claims:Claim[],asOf="2026-04-01"){const edges=[["0–30",0,30],["31–60",31,60],["61–90",61,90],["90+",91,9999]] as const;return edges.map(([label,min,max])=>({label,count:claims.filter(c=>c.status!=="closed"&&daysSince(c.openedAt,asOf)>=min&&daysSince(c.openedAt,asOf)<=max).length}))}
export function updateFrequency(claims:Claim[]){const active=claims.filter(c=>c.status!=="closed");const intervals=active.flatMap(c=>c.updates.slice(1).map((u,i)=>daysSince(c.updates[i].at,u.at)));return metric(intervals.length?intervals.reduce((a,b)=>a+b,0)/intervals.length:null,intervals.length,active.length,"Average days between recorded updates on active files.")}
export function daysSinceLastUpdate(claim:Claim,asOf="2026-04-01"){const latest=claim.updates.reduce((a,b)=>a.at>b.at?a:b);return daysSince(latest.at,asOf)}
function daysSince(date:string,asOf:string){return Math.max(0,Math.round((Date.parse(asOf)-Date.parse(date))/86400000))}
