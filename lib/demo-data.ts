import type { Adjuster, Carrier, Claim, ClaimWeatherMatch, Contractor, DemoDataset, FileStatus, FinancialStatus, ServiceType, WeatherEvent } from "@/types/intelligence";

const contractors:Contractor[]=[
  {id:"con-01",name:"Apex Restoration Group",region:"South Central"},{id:"con-02",name:"BlueLine Response",region:"Southeast"},
  {id:"con-03",name:"Summit Commercial Roofing",region:"Mountain"},{id:"con-04",name:"Northstar Mitigation",region:"Northeast"},
  {id:"con-05",name:"Prairie Loss Solutions",region:"Midwest"},{id:"con-06",name:"Coastal Recovery Partners",region:"Gulf Coast"},
];
const carriers:Carrier[]=[
  {id:"car-01",name:"Granite Mutual"},{id:"car-02",name:"Harbor Specialty"},{id:"car-03",name:"Crestline Insurance"},
  {id:"car-04",name:"Pioneer Risk"},{id:"car-05",name:"Keystone Indemnity"},
];
const adjusters:Adjuster[]=Array.from({length:10},(_,i)=>({id:`adj-${String(i+1).padStart(2,"0")}`,name:["Maya Chen","Liam Brooks","Nora Patel","Ethan Reed","Ava Martinez","Noah Bennett","Iris Walker","Owen Hayes","Mia Foster","Lucas Gray"][i],carrierId:carriers[i%carriers.length].id}));
const stateZips=[["TX","75001"],["FL","33602"],["CO","80202"],["MA","02108"],["IL","60601"],["GA","30303"],["OK","73102"],["LA","70112"],["NC","27601"],["MO","64106"]] as const;
const quarters=["2024 Q1","2024 Q2","2024 Q3","2024 Q4","2025 Q1","2025 Q2","2025 Q3","2025 Q4","2026 Q1"];
const statuses:FileStatus[]=["closed","closed","closed","negotiating","estimating","stalled","new"];
const financialStatuses:FinancialStatus[]=["captured","captured","captured","partially_captured","not_captured","invalid","not_applicable"];

function iso(date:Date){return date.toISOString().slice(0,10)}
const claims:Claim[]=Array.from({length:126},(_,i)=>{
  const quarterIndex=Math.floor(i/14); const quarter=quarters[quarterIndex];
  const year=2024+Math.floor(quarterIndex/4); const q=quarterIndex%4; const opened=new Date(Date.UTC(year,q*3+(i%3),2+(i*3)%24));
  const serviceType:ServiceType=i%4===0?"estimate_only":"claim_handling"; const status=statuses[(i+quarterIndex)%statuses.length];
  const financialStatus=serviceType==="estimate_only"&&i%3===0?"not_applicable":financialStatuses[(i*2+quarterIndex)%financialStatuses.length];
  const financialUsable=financialStatus==="captured"||financialStatus==="partially_captured";
  const original=financialUsable?18000+((i*7919)%97000):null; const additional=financialUsable?2400+((i*1879)%28000):null;
  const cycle=18+((i*7)%72); const closed=status==="closed"?new Date(opened.getTime()+cycle*86400000):null;
  const carrier=carriers[i%carriers.length]; const adjuster=adjusters.find(a=>a.carrierId===carrier.id)!;
  return {id:`clm-${String(i+1).padStart(4,"0")}`,claimNumber:`TS-${year}-${String(4100+i).padStart(5,"0")}`,sourceQuarter:quarter,contractorId:contractors[(i*3)%contractors.length].id,carrierId:carrier.id,adjusterId:adjuster.id,state:stateZips[i%stateZips.length][0],zipCode:stateZips[i%stateZips.length][1],serviceType,status,openedAt:iso(opened),closedAt:closed?iso(closed):null,originalRcv:original,settledRcv:financialUsable&&original!==null&&additional!==null?original+additional:null,additionalRcv:additional,totalScopeFee:financialUsable&&additional!==null?Math.round(additional*.075):null,financialStatus,updates:Array.from({length:1+(i%4)},(_,u)=>({at:iso(new Date(opened.getTime()+(u*8+2)*86400000)),type:u===0?"status":u%2?"note":"financial",author:u%2?"TotalScope Operations":adjuster.name,summary:["File intake completed","Estimate documentation reviewed","Carrier response recorded","Settlement position updated"][u%4]}))};
});
const weatherEvents:WeatherEvent[]=[
 {id:"wx-01",name:"North Texas Hail Corridor",type:"hail",occurredAt:"2025-03-14",states:["TX","OK"],zipPrefixes:["75","73"],severity:"severe"},
 {id:"wx-02",name:"Gulf Wind Event",type:"wind",occurredAt:"2025-06-22",states:["LA","FL"],zipPrefixes:["70","33"],severity:"high"},
 {id:"wx-03",name:"Front Range Hail Event",type:"hail",occurredAt:"2025-07-08",states:["CO"],zipPrefixes:["80"],severity:"high"},
 {id:"wx-04",name:"Northeast Freeze",type:"freeze",occurredAt:"2026-01-18",states:["MA"],zipPrefixes:["02"],severity:"moderate"},
 {id:"wx-05",name:"Southeast Wind Corridor",type:"wind",occurredAt:"2026-03-03",states:["GA","NC"],zipPrefixes:["30","27"],severity:"high"},
];
const claimWeatherMatches:ClaimWeatherMatch[]=claims.filter((_,i)=>i%3===0).map((claim,i)=>({claimId:claim.id,weatherEventId:weatherEvents[i%weatherEvents.length].id,confidence:.72+(i%6)*.045,matchReason:`State, ZIP prefix, and loss-window alignment`}));
export const demoData:DemoDataset={claims,contractors,carriers,adjusters,weatherEvents,claimWeatherMatches,quarters,states:[...new Set(claims.map(c=>c.state))].sort(),zipCodes:[...new Set(claims.map(c=>c.zipCode))].sort()};
