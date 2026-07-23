export const FINANCIAL_STATUSES = ["captured","not_captured","partially_captured","invalid","not_applicable"] as const;
export type FinancialStatus = typeof FINANCIAL_STATUSES[number];
export type ServiceType = "estimate_only" | "claim_handling";
export type FileStatus = "new" | "estimating" | "negotiating" | "stalled" | "closed";
export type ConfidenceGrade = "A" | "B" | "C" | "D";
export type MetricStatus = "measured" | "inferred" | "unavailable";

export interface Contractor { id:string; name:string; region:string; }
export interface Carrier { id:string; name:string; }
export interface Adjuster { id:string; name:string; carrierId:string; }
export interface ClaimUpdate { at:string; type:"note"|"status"|"financial"; author:string; summary:string; }
export interface Claim {
  id:string; claimNumber:string; sourceQuarter:string; contractorId:string; carrierId:string; adjusterId:string;
  state:string; zipCode:string; serviceType:ServiceType; status:FileStatus; openedAt:string; closedAt:string|null;
  originalRcv:number|null; settledRcv:number|null; additionalRcv:number|null; totalScopeFee:number|null;
  financialStatus:FinancialStatus; updates:ClaimUpdate[];
}
export interface WeatherEvent { id:string; name:string; type:"hail"|"wind"|"hurricane"|"freeze"; occurredAt:string; states:string[]; zipPrefixes:string[]; severity:"moderate"|"high"|"severe"; }
export interface ClaimWeatherMatch { claimId:string; weatherEventId:string; confidence:number; matchReason:string; }
export interface DemoDataset { claims:Claim[]; contractors:Contractor[]; carriers:Carrier[]; adjusters:Adjuster[]; weatherEvents:WeatherEvent[]; claimWeatherMatches:ClaimWeatherMatch[]; quarters:string[]; states:string[]; zipCodes:string[]; }
export interface FilterState { quarter:string; startDate:string; endDate:string; contractorId:string; carrierId:string; state:string; serviceType:string; }
export interface KpiMetadata { numerator:number|null; denominator:number|null; coveragePercent:number; confidence:ConfidenceGrade; status:MetricStatus; explanation:string; drillDown:Partial<FilterState>; }
export interface MetricResult { value:number|null; metadata:KpiMetadata; }
export interface Observation { id:string; severity:"info"|"positive"|"warning"|"critical"; title:string; detail:string; basis:string; }
