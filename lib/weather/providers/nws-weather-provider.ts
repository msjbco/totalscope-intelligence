import "server-only";

import type {
  ForecastPeriod,
  GeoJsonGeometry,
  HourlyWeatherForecast,
  WeatherAlert,
  WeatherForecast,
  WeatherLocation,
  WeatherProviderStatus,
} from "@/lib/weather/contracts";
import type { WeatherProvider } from "@/lib/weather/providers/weather-provider";

const API_ROOT = "https://api.weather.gov";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;

type JsonRecord = Record<string, unknown>;

function record(value: unknown, context: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${context} must be an object.`);
  return value as JsonRecord;
}

function string(value: unknown, field: string, required = false): string | null {
  if (value == null && !required) return null;
  if (typeof value !== "string" || (required && !value)) throw new Error(`${field} must be a string.`);
  return value;
}

function timestamp(value: unknown, field: string, required = false): string | null {
  const parsed = string(value, field, required);
  if (parsed == null) return null;
  if (Number.isNaN(Date.parse(parsed))) throw new Error(`${field} must be an ISO timestamp.`);
  return new Date(parsed).toISOString();
}

function geometry(value: unknown): GeoJsonGeometry | null {
  if (value == null) return null;
  const candidate = record(value, "geometry");
  if (!['Point', 'Polygon', 'MultiPolygon'].includes(String(candidate.type)) || !Array.isArray(candidate.coordinates)) {
    throw new Error("NWS geometry is not supported GeoJSON.");
  }
  return candidate as GeoJsonGeometry;
}

function appIdentity() {
  const value = process.env.NWS_USER_AGENT;
  if (!value || !value.includes("@")) {
    throw new Error("NWS_USER_AGENT is required and must identify TotalScope plus a monitored contact email.");
  }
  return value;
}

async function delay(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class NWSWeatherProvider implements WeatherProvider {
  readonly id = "nws";
  private lastAttempt: string | null = null;
  private lastSuccess: string | null = null;
  private lastError: string | null = null;

  private async request(url: string): Promise<unknown> {
    this.lastAttempt = new Date().toISOString();
    let finalError: Error | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      const startedAt = Date.now();
      try {
        const response = await fetch(url, {
          headers: { Accept: "application/geo+json, application/json", "User-Agent": appIdentity() },
          signal: controller.signal,
          next: { revalidate: url.includes("/alerts/") ? 120 : 900 },
        });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          if (!retryable) throw new Error(`NWS request failed (${response.status}).`);
          throw new Error(`NWS temporarily unavailable (${response.status}).`);
        }
        const payload: unknown = await response.json();
        this.lastSuccess = new Date().toISOString();
        this.lastError = null;
        console.info(JSON.stringify({ provider: this.id, operation: "request", status: "success", latencyMs: Date.now() - startedAt, retryCount: attempt }));
        return payload;
      } catch (error) {
        finalError = error instanceof Error ? error : new Error("Unknown NWS provider error.");
        this.lastError = finalError.message;
        console.warn(JSON.stringify({ provider: this.id, operation: "request", status: "failure", latencyMs: Date.now() - startedAt, retryCount: attempt, errorClassification: finalError.name }));
        if (attempt < MAX_ATTEMPTS - 1) await delay(250 * 2 ** attempt);
      } finally {
        clearTimeout(timer);
      }
    }
    throw finalError ?? new Error("NWS request failed.");
  }

  async getActiveAlerts(): Promise<WeatherAlert[]> {
    const retrievedAt = new Date().toISOString();
    const payload = record(await this.request(`${API_ROOT}/alerts/active?status=actual`), "NWS alerts response");
    if (!Array.isArray(payload.features)) throw new Error("NWS alerts response requires features.");
    return payload.features.map((raw, index) => {
      const feature = record(raw, `features[${index}]`);
      const properties = record(feature.properties, `features[${index}].properties`);
      const sourceId = string(feature.id, "feature.id", true)!;
      const sentAt = timestamp(properties.sent, "properties.sent", true)!;
      return {
        kind: "alert" as const,
        provider: this.id,
        sourceId,
        sourceUrl: string(properties.web, "properties.web") ?? sourceId,
        sourceTimestamp: sentAt,
        retrievedAt,
        event: string(properties.event, "properties.event", true)!,
        status: string(properties.status, "properties.status", true)!,
        messageType: string(properties.messageType, "properties.messageType", true)!,
        severity: string(properties.severity, "properties.severity"),
        certainty: string(properties.certainty, "properties.certainty"),
        urgency: string(properties.urgency, "properties.urgency"),
        headline: string(properties.headline, "properties.headline"),
        description: string(properties.description, "properties.description"),
        instruction: string(properties.instruction, "properties.instruction"),
        areaDescription: string(properties.areaDesc, "properties.areaDesc"),
        issuedAt: sentAt,
        effectiveAt: timestamp(properties.effective, "properties.effective", true)!,
        onsetAt: timestamp(properties.onset, "properties.onset"),
        expiresAt: timestamp(properties.expires, "properties.expires", true)!,
        endsAt: timestamp(properties.ends, "properties.ends"),
        geometry: geometry(feature.geometry),
      };
    });
  }

  private async forecast(location: WeatherLocation, hourly: boolean): Promise<WeatherForecast> {
    const point = record(await this.request(`${API_ROOT}/points/${location.latitude},${location.longitude}`), "NWS point response");
    const pointProperties = record(point.properties, "NWS point properties");
    const endpoint = string(pointProperties[hourly ? "forecastHourly" : "forecast"], "forecast endpoint", true)!;
    const payload = record(await this.request(endpoint), "NWS forecast response");
    const properties = record(payload.properties, "NWS forecast properties");
    if (!Array.isArray(properties.periods)) throw new Error("NWS forecast response requires periods.");
    const periods: ForecastPeriod[] = properties.periods.map((raw, index) => {
      const period = record(raw, `periods[${index}]`);
      const probability = period.probabilityOfPrecipitation == null ? null : record(period.probabilityOfPrecipitation, "probabilityOfPrecipitation");
      return {
        name: string(period.name, "period.name", true)!,
        startTime: timestamp(period.startTime, "period.startTime", true)!,
        endTime: timestamp(period.endTime, "period.endTime", true)!,
        temperature: typeof period.temperature === "number" ? period.temperature : null,
        temperatureUnit: string(period.temperatureUnit, "period.temperatureUnit"),
        windSpeed: string(period.windSpeed, "period.windSpeed"),
        windDirection: string(period.windDirection, "period.windDirection"),
        shortForecast: string(period.shortForecast, "period.shortForecast", true)!,
        detailedForecast: string(period.detailedForecast, "period.detailedForecast") ?? "",
        precipitationProbabilityPercent: probability && typeof probability.value === "number" ? probability.value : null,
      };
    });
    const retrievedAt = new Date().toISOString();
    const sourceTimestamp = timestamp(properties.updated, "properties.updated")
      ?? timestamp(properties.generatedAt, "properties.generatedAt", true)!;
    return {
      kind: "forecast",
      provider: this.id,
      sourceId: endpoint,
      sourceUrl: endpoint,
      sourceTimestamp,
      retrievedAt,
      location,
      periods,
    };
  }

  getForecast(location: WeatherLocation) {
    return this.forecast(location, false);
  }

  getHourlyForecast(location: WeatherLocation): Promise<HourlyWeatherForecast> {
    return this.forecast(location, true);
  }

  async providerHealth(): Promise<WeatherProviderStatus> {
    const attempted = this.lastAttempt ?? new Date().toISOString();
    return {
      provider: this.id,
      state: this.lastError ? "degraded" : this.lastSuccess ? "operational" : "not_configured",
      lastAttemptedRefresh: attempted,
      lastSuccessfulRefresh: this.lastSuccess,
      stale: !this.lastSuccess || Date.now() - Date.parse(this.lastSuccess) > 15 * 60_000,
      message: this.lastError ?? (this.lastSuccess ? "Official NWS API requests are succeeding." : "No provider request has completed."),
    };
  }
}
