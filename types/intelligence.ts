export type RiskLevel="low"|"watch"|"elevated"|"critical";
export interface IntelligenceSignal { id:string; title:string; category:"weather"|"carrier"|"contractor"|"portfolio"; risk:RiskLevel; affectedAssets:number; updatedAt:string; }
