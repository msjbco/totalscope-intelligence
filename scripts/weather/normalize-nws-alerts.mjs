import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function timestamp(value, field, required = false) {
  if (value == null && !required) return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO timestamp`);
  }
  return new Date(value).toISOString();
}

function lifecycle(event) {
  const normalized = event.toLowerCase();
  if (normalized.includes("outlook") || normalized.includes("forecast")) return "forecast";
  if (normalized.includes("watch")) return "watch";
  if (normalized.includes("warning")) return "warning";
  if (normalized.includes("advisory")) return "advisory";
  return "statement";
}

export function normalizeNwsFeatureCollection(payload, observedAt) {
  if (payload?.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    throw new Error("NWS payload must be a GeoJSON FeatureCollection");
  }
  const sourceObservedAt = timestamp(observedAt, "observedAt", true);
  return payload.features.map((feature) => {
    const properties = feature?.properties ?? {};
    if (!feature?.id || feature.type !== "Feature" || !properties.event) {
      throw new Error("NWS alert requires id, Feature type, and event");
    }
    const normalized = {
      providerEventId: String(feature.id),
      lifecycleStatus: lifecycle(String(properties.event)),
      eventName: String(properties.event),
      providerStatus: String(properties.status ?? "Unknown"),
      messageType: String(properties.messageType ?? "Unknown"),
      severity: properties.severity ?? null,
      certainty: properties.certainty ?? null,
      urgency: properties.urgency ?? null,
      headline: properties.headline ?? null,
      areaDescription: properties.areaDesc ?? null,
      sentAt: timestamp(properties.sent, "properties.sent", true),
      effectiveAt: timestamp(properties.effective, "properties.effective", true),
      onsetAt: timestamp(properties.onset, "properties.onset"),
      expiresAt: timestamp(properties.expires, "properties.expires", true),
      endsAt: timestamp(properties.ends, "properties.ends"),
      sourceObservedAt,
      geometry: feature.geometry ?? null,
      sourceUrl: properties.web ?? "https://api.weather.gov/alerts",
    };
    const revisionFacts = { ...normalized };
    delete revisionFacts.sourceObservedAt;
    return { ...normalized, revisionSha256: fingerprint(revisionFacts) };
  });
}
