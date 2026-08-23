import type { NormalizedWeatherEventType, WeatherAlert, WeatherEvidence, WeatherOpportunityAssessment, WeatherOpportunityScoreComponent, WeatherSeverityAssessment } from "@/lib/weather/contracts";

const TYPE_BASE: Record<NormalizedWeatherEventType, number> = {
  "Hail": 52,
  "Damaging / Extreme Wind": 48,
  "Severe Convective": 38,
  "Tornado": 62,
  "Tropical / Hurricane": 58,
  "Flooding": 24,
  "Winter / Ice": 28,
  "Other": 10,
};
export const WEATHER_OPPORTUNITY_MODEL_VERSION = "weather_opportunity_v1" as const;

function sourceText(alert: WeatherAlert) {
  return [alert.event, alert.headline, alert.description, alert.instruction].filter(Boolean).join(" ");
}

function maximumNumber(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].map((match) => Number(match[1])).filter(Number.isFinite).reduce<number | null>((max, value) => max == null || value > max ? value : max, null);
}

export function extractWeatherEvidence(alert: WeatherAlert): WeatherEvidence {
  const text = sourceText(alert);
  const hailSupported = /\bhail\b/i.test(text);
  const damagingWindSupported = /\b(damaging|destructive|extreme|high) winds?\b|\bwind damage\b/i.test(text) || /high wind|extreme wind|hurricane|tropical storm/i.test(alert.event);
  return {
    hailSupported,
    hailSizeInches: hailSupported ? maximumNumber(text, /(?:hail(?:stones?)?[^.\n]{0,45}?)(\d+(?:\.\d+)?)\s*(?:inch|inches|in\b)/gi) : null,
    damagingWindSupported,
    maximumWindMph: damagingWindSupported ? maximumNumber(text, /(\d{2,3})\s*(?:mph|m\.p\.h\.)/gi) : null,
  };
}

export function normalizeWeatherEvent(alert: WeatherAlert): NormalizedWeatherEventType {
  const event = alert.event.toLowerCase();
  const evidence = extractWeatherEvidence(alert);
  if (/tornado/.test(event)) return "Tornado";
  if (/hurricane|tropical storm|typhoon|storm surge/.test(event)) return "Tropical / Hurricane";
  if (evidence.hailSupported && /hail/.test(event)) return "Hail";
  if (/extreme wind|high wind|wind advisory|hurricane force wind/.test(event) || evidence.damagingWindSupported) return "Damaging / Extreme Wind";
  if (/severe thunderstorm|convective/.test(event)) return evidence.hailSupported ? "Hail" : "Severe Convective";
  if (/flash flood|flood/.test(event)) return "Flooding";
  if (/winter storm|blizzard|ice storm|freez|snow squall/.test(event)) return "Winter / Ice";
  return "Other";
}

export function assessWeatherSeverity(alert: WeatherAlert): WeatherSeverityAssessment {
  const severity = alert.severity?.toLowerCase();
  const urgency = alert.urgency?.toLowerCase();
  const certainty = alert.certainty?.toLowerCase();
  const score = Math.min(100, (severity === "extreme" ? 80 : severity === "severe" ? 60 : severity === "moderate" ? 35 : 15)
    + (urgency === "immediate" ? 10 : urgency === "expected" ? 5 : 0)
    + (certainty === "observed" ? 10 : certainty === "likely" ? 5 : 0));
  return { score, label: score >= 80 ? "Extreme" : score >= 60 ? "Severe" : score >= 35 ? "Moderate" : "Minor", sourceSeverity: alert.severity };
}

export function assessWeatherOpportunity(alert: WeatherAlert): WeatherOpportunityAssessment {
  const normalizedEventType = normalizeWeatherEvent(alert);
  const evidence = extractWeatherEvidence(alert);
  const certainty = alert.certainty?.toLowerCase();
  const urgency = alert.urgency?.toLowerCase();
  const components: WeatherOpportunityScoreComponent[] = [{ key: "event_base", label: `${normalizedEventType} base relevance`, points: TYPE_BASE[normalizedEventType], source: "event" }];
  const add = (key: string, label: string, points: number, source: WeatherOpportunityScoreComponent["source"]) => { if (points) components.push({ key, label, points, source }); };
  if (evidence.hailSupported) add("explicit_hail", "Hail explicitly supported by the official source", 8, "evidence");
  if (evidence.hailSizeInches != null) add("hail_size", `Official text reports hail up to ${evidence.hailSizeInches} in`, evidence.hailSizeInches >= 4 ? 20 : evidence.hailSizeInches >= 3 ? 16 : evidence.hailSizeInches >= 2 ? 12 : evidence.hailSizeInches >= 1 ? 6 : 2, "evidence");
  if (evidence.damagingWindSupported) add("damaging_wind", "Damaging/high wind explicitly supported", 6, "evidence");
  if (evidence.maximumWindMph != null) add("wind_speed", `Official text reports wind up to ${evidence.maximumWindMph} mph`, evidence.maximumWindMph >= 100 ? 20 : evidence.maximumWindMph >= 80 ? 14 : evidence.maximumWindMph >= 70 ? 9 : evidence.maximumWindMph >= 58 ? 5 : 0, "evidence");
  if (/tornado emergency/i.test(sourceText(alert))) add("tornado_emergency", "Official source identifies a tornado emergency", 18, "evidence");
  if (/major hurricane|category\s*[3-5]/i.test(sourceText(alert))) add("major_tropical", "Official source identifies major tropical intensity", 18, "evidence");
  if (certainty === "observed") add("observed", "NWS certainty is observed", 5, "certainty");
  else if (certainty === "likely") add("likely", "NWS certainty is likely", 3, "certainty");
  if (urgency === "immediate") add("immediate", "NWS urgency is immediate", 5, "urgency");
  else if (urgency === "expected") add("expected", "NWS urgency is expected", 2, "urgency");
  let score = components.reduce((sum, component) => sum + component.points, 0);
  score = Math.round(Math.min(100, score));
  return { modelVersion: WEATHER_OPPORTUNITY_MODEL_VERSION, score, label: score >= 85 ? "Very high" : score >= 70 ? "High" : score >= 45 ? "Moderate" : "Low", normalizedEventType, rationale: components.map((component) => `${component.label}: +${component.points}`), breakdown: components, evidence };
}

/** @deprecated The current model is weather-only; use assessWeatherOpportunity. */
export const assessTotalScopeOpportunity = assessWeatherOpportunity;
