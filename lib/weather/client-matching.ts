import type { ClientBranchLocation, ContractorProspect, ExistingClientMatchStatus } from "@/lib/weather/contracts";
import { haversineDistanceKm } from "@/lib/weather/geo";

function normalizeName(value: string) {
  return value.toLowerCase().replace(/\b(llc|inc|company|co|roofing|restoration)\b/g, "").replace(/[^a-z0-9]/g, "");
}

function normalizePhone(value: string | null) {
  return value?.replace(/\D/g, "").slice(-10) || null;
}

function domain(value: string | null) {
  if (!value) return null;
  try { return new URL(value.includes("://") ? value : `https://${value}`).hostname.replace(/^www\./, ""); }
  catch { return value.split("@").at(-1)?.toLowerCase() ?? null; }
}

export type ExistingBusiness = ClientBranchLocation & { phone?: string | null; website?: string | null; email?: string | null };

export function matchExistingClient(prospect: ContractorProspect, clients: ExistingBusiness[]): {
  status: ExistingClientMatchStatus;
  rationale: string[];
} {
  let bestScore = 0;
  let bestRationale: string[] = [];
  for (const client of clients) {
    let score = 0;
    const rationale: string[] = [];
    if (normalizeName(prospect.name) === normalizeName(client.clientName)) { score += 4; rationale.push("normalized business name"); }
    if (normalizePhone(prospect.phone) && normalizePhone(prospect.phone) === normalizePhone(client.phone ?? null)) { score += 5; rationale.push("phone"); }
    if (domain(prospect.website) && domain(prospect.website) === domain(client.website ?? null)) { score += 5; rationale.push("website domain"); }
    if (domain(prospect.email) && domain(prospect.email) === domain(client.email ?? null)) { score += 4; rationale.push("email domain"); }
    if (prospect.latitude != null && prospect.longitude != null && client.latitude != null && client.longitude != null && haversineDistanceKm([prospect.longitude, prospect.latitude], [client.longitude, client.latitude]) < 0.25) { score += 2; rationale.push("location within 250 m"); }
    if (score > bestScore) { bestScore = score; bestRationale = rationale; }
  }
  return {
    status: bestScore >= 5 ? "confirmed_existing_client" : bestScore >= 3 ? "possible_existing_client" : "not_existing_client",
    rationale: bestRationale.length ? bestRationale : ["no strong client match signals"],
  };
}
