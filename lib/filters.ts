import type { Claim, FilterState } from "@/types/intelligence";
export const defaultFilters:FilterState={quarter:"2026 Q1",startDate:"",endDate:"",contractorId:"",carrierId:"",state:"",serviceType:""};
export function filterClaims(claims:Claim[],f:FilterState){
 return claims.filter(c=>(!f.quarter||f.quarter==="all"||c.sourceQuarter===f.quarter)&&(!f.startDate||c.openedAt>=f.startDate)&&(!f.endDate||c.openedAt<=f.endDate)&&(!f.contractorId||c.contractorId===f.contractorId)&&(!f.carrierId||c.carrierId===f.carrierId)&&(!f.state||c.state===f.state)&&(!f.serviceType||c.serviceType===f.serviceType));
}
