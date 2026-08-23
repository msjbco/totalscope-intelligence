import type { ForecastPeriod, NormalizedWeatherEventType, WeatherForecast } from "@/lib/weather/contracts";

export const FORECAST_SIGNAL_MODEL_VERSION = "forecast_signal_v1" as const;
export type ForecastSignal = { id: string; locationId: string; locationName: string; period: ForecastPeriod; eventType: NormalizedWeatherEventType; rationale: string; modelVersion: typeof FORECAST_SIGNAL_MODEL_VERSION; sourceUrl: string; retrievedAt: string };

function maximumWindMph(value: string | null) {
  if (!value) return null;
  const values = [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  return values.length ? Math.max(...values) : null;
}

export function classifyForecastPeriod(period: ForecastPeriod): { eventType: NormalizedWeatherEventType; rationale: string } | null {
  const text = `${period.shortForecast} ${period.detailedForecast}`;
  const wind = maximumWindMph(period.windSpeed);
  if (/tornado/i.test(text)) return { eventType: "Tornado", rationale: "NWS forecast explicitly references tornado conditions." };
  if (/hurricane|tropical storm|typhoon|storm surge/i.test(text)) return { eventType: "Tropical / Hurricane", rationale: "NWS forecast explicitly references tropical conditions." };
  if (/\bhail\b/i.test(text)) return { eventType: "Hail", rationale: "NWS forecast explicitly references hail." };
  if (/damaging|destructive|extreme winds?|high winds?/i.test(text) || (wind != null && wind >= 40)) return { eventType: "Damaging / Extreme Wind", rationale: wind != null ? `NWS forecast reports wind up to ${wind} mph.` : "NWS forecast explicitly references damaging/high wind." };
  if (/severe thunderstorm|severe storms?/i.test(text)) return { eventType: "Severe Convective", rationale: "NWS forecast explicitly references severe thunderstorms." };
  if (/flash flood|flooding|heavy rain/i.test(text)) return { eventType: "Flooding", rationale: "NWS forecast explicitly references flooding or heavy rain." };
  if (/blizzard|ice storm|freezing rain|significant icing|winter storm/i.test(text)) return { eventType: "Winter / Ice", rationale: "NWS forecast explicitly references significant winter or ice conditions." };
  return null;
}

export function deriveForecastSignals(forecasts: WeatherForecast[], asOf: string, horizonHours: number): ForecastSignal[] {
  const start = Date.parse(asOf);
  const end = start + horizonHours * 3_600_000;
  return forecasts.flatMap((forecast) => forecast.periods.flatMap((period) => {
    if (Date.parse(period.endTime) < start || Date.parse(period.startTime) > end) return [];
    const classification = classifyForecastPeriod(period);
    return classification ? [{ id: `${forecast.location.id}:${period.startTime}:${classification.eventType}`, locationId: forecast.location.id, locationName: forecast.location.name, period, ...classification, modelVersion: FORECAST_SIGNAL_MODEL_VERSION, sourceUrl: forecast.sourceUrl, retrievedAt: forecast.retrievedAt }] : [];
  })).sort((left, right) => left.period.startTime.localeCompare(right.period.startTime) || left.locationName.localeCompare(right.locationName) || left.id.localeCompare(right.id));
}
