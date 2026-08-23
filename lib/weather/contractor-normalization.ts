import type { ContractorProspect } from "@/lib/weather/contracts";

export type RawContractorBusiness = {
  provider: string;
  providerBusinessId: string;
  name: string;
  address?: { street?: string; city?: string; state?: string; postalCode?: string };
  coordinates?: { latitude: number; longitude: number };
  phone?: string;
  email?: string;
  website?: string;
  contactName?: string;
  category?: string;
  sourceReference?: string;
};

function optional(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeContractorBusiness(raw: RawContractorBusiness, retrievedAt: string): ContractorProspect {
  if (!raw.provider.trim() || !raw.providerBusinessId.trim() || !raw.name.trim()) {
    throw new Error("Contractor provider, business ID, and name are required.");
  }
  if (Number.isNaN(Date.parse(retrievedAt))) throw new Error("Contractor retrieval time must be an ISO timestamp.");
  const latitude = raw.coordinates?.latitude ?? null;
  const longitude = raw.coordinates?.longitude ?? null;
  if (latitude != null && (latitude < -90 || latitude > 90)) throw new Error("Contractor latitude is invalid.");
  if (longitude != null && (longitude < -180 || longitude > 180)) throw new Error("Contractor longitude is invalid.");
  const contactFields = [raw.phone, raw.email, raw.website, raw.contactName].filter((item) => optional(item) !== null).length;
  const locationFields = [raw.address?.city, raw.address?.state, raw.address?.postalCode].filter((item) => optional(item) !== null).length;
  return {
    provider: raw.provider.trim(), providerBusinessId: raw.providerBusinessId.trim(), name: raw.name.trim(),
    streetAddress: optional(raw.address?.street), city: optional(raw.address?.city), state: optional(raw.address?.state),
    postalCode: optional(raw.address?.postalCode), latitude, longitude, distanceFromStormKm: null,
    phone: optional(raw.phone), email: optional(raw.email), website: optional(raw.website), contactName: optional(raw.contactName),
    category: optional(raw.category), sourceReference: optional(raw.sourceReference), retrievedAt: new Date(retrievedAt).toISOString(),
    lastRefreshedAt: new Date(retrievedAt).toISOString(), completeness: contactFields >= 2 && locationFields >= 2 ? "complete" : contactFields + locationFields >= 2 ? "partial" : "minimal",
    matchStatus: "not_existing_client", matchRationale: ["client matching not yet evaluated"],
  };
}
