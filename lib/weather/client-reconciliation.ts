import type { ExistingClientMatchStatus, LocationPrecision } from "@/lib/weather/contracts";

export type ClientLocationImportCandidate = {
  externalClientId: string | null; companyName: string; streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null;
  phone: string | null; email: string | null; website: string | null; locationPrecision: LocationPrecision;
};

export type ClientMatchAssessment = { status: ExistingClientMatchStatus; deterministicSignals: string[]; requiresReview: boolean };

export function normalizeMatchText(value: string | null) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() || null;
}

export function assessClientMatch(candidate: ClientLocationImportCandidate, known: ClientLocationImportCandidate): ClientMatchAssessment {
  const signals: string[] = [];
  if (candidate.externalClientId && candidate.externalClientId === known.externalClientId) signals.push("canonical_client_id");
  if (normalizeMatchText(candidate.companyName) === normalizeMatchText(known.companyName)) signals.push("normalized_company_name");
  if (candidate.streetAddress && normalizeMatchText(candidate.streetAddress) === normalizeMatchText(known.streetAddress) && candidate.postalCode === known.postalCode) signals.push("street_address_and_zip");
  if (candidate.phone && candidate.phone.replace(/\D/g, "") === known.phone?.replace(/\D/g, "")) signals.push("phone");
  const confirmed = signals.includes("canonical_client_id") || signals.includes("street_address_and_zip") || signals.includes("phone");
  return confirmed ? { status: "confirmed_existing_client", deterministicSignals: signals, requiresReview: false }
    : signals.length ? { status: "possible_existing_client", deterministicSignals: signals, requiresReview: true }
      : { status: "not_existing_client", deterministicSignals: [], requiresReview: false };
}
