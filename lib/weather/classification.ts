import type { OpportunityLevel, WeatherAlert, WeatherOpportunity } from "@/lib/weather/contracts";

const MATERIAL_EVENTS = /(tornado|severe thunderstorm|convective|hurricane|tropical storm|storm surge|extreme wind|high wind|wind advisory|flash flood|flood|winter storm|blizzard|ice storm|snow squall|hail)/i;

export function classifyAlert(alert: WeatherAlert): WeatherOpportunity | null {
  if (!MATERIAL_EVENTS.test(alert.event)) return null;
  const severity = alert.severity?.toLowerCase();
  const urgency = alert.urgency?.toLowerCase();
  const certainty = alert.certainty?.toLowerCase();
  let level: OpportunityLevel = "monitor";
  const rationale: string[] = [`Official ${alert.provider} ${alert.event}`];
  if (urgency === "immediate" || severity === "extreme") {
    level = "active";
    rationale.push("Immediate urgency or extreme severity");
  } else if (severity === "severe" && (certainty === "observed" || certainty === "likely")) {
    level = "high";
    rationale.push("Severe with observed/likely certainty");
  } else if (severity === "severe" || urgency === "expected") {
    level = "elevated";
    rationale.push("Severe or expected official alert");
  }
  return { id: alert.sourceId, title: alert.event, level, rationale, alert };
}
