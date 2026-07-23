import { getDataMode } from "./config";
import { getImportValidation, getLiveClaimDetail, getLiveDashboardSummary, listLiveClaims } from "./live-repository";

export async function dashboardSummary() {
  if (getDataMode() !== "live") return null;
  return getLiveDashboardSummary();
}
export async function claimsList() {
  if (getDataMode() !== "live") return null;
  return listLiveClaims();
}
export async function claimDetail(id:string) {
  if (getDataMode() !== "live") return null;
  return getLiveClaimDetail(id);
}
export async function importValidation() {
  if (getDataMode() !== "live") return { mode:"demo" as const, available:false, counts:{}, expected:{}, issues:[], error:"Import validation requires live mode." };
  return getImportValidation();
}
