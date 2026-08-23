import "server-only";

import { supabaseRest } from "@/lib/data/supabase-rest";
import type { ClientExposure, WeatherAlert, WeatherProviderStatus } from "@/lib/weather/contracts";
import { listInternalBranchLocations } from "@/lib/weather/branch-repository";

export type LiveWeatherAlert = {
  id: string;
  provider_event_id: string;
  lifecycle_status: "forecast" | "watch" | "warning" | "advisory" | "statement";
  event_name: string;
  severity: string | null;
  certainty: string | null;
  urgency: string | null;
  headline: string | null;
  area_description: string | null;
  effective_at: string;
  onset_at: string | null;
  expires_at: string;
  geometry_json: unknown;
  source_observed_at: string;
  retrieved_at: string;
  source_url: string;
};

type PersistedOpportunity = { id: string; weather_event_id: string };
type PersistedExposure = { weather_opportunity_id: string; client_id: string; branch_id: string; exposure_status: ClientExposure["status"]; distance_km: number | null; methodology: string };
type RefreshRow = { attempted_at: string; completed_at: string | null; status: "running" | "succeeded" | "failed"; sanitized_error: string | null };

const inFilter = (values: string[]) => `(${values.join(",")})`;

export async function listLiveWeatherAlerts(): Promise<WeatherAlert[]> {
  const rows = await supabaseRest<LiveWeatherAlert[]>(
    "weather_internal_active_alerts?select=id,provider_event_id,lifecycle_status,event_name,severity,certainty,urgency,headline,area_description,effective_at,onset_at,expires_at,geometry_json,source_observed_at,retrieved_at,source_url&order=urgency.desc,effective_at.desc",
  );
  return rows.map((row) => ({ kind: "alert", provider: "nws", sourceId: row.id, sourceUrl: row.source_url, sourceTimestamp: row.source_observed_at, retrievedAt: row.retrieved_at, event: row.event_name, status: "Actual", messageType: "Alert", severity: row.severity, certainty: row.certainty, urgency: row.urgency, headline: row.headline, description: null, instruction: null, areaDescription: row.area_description, issuedAt: row.source_observed_at, effectiveAt: row.effective_at, onsetAt: row.onset_at, expiresAt: row.expires_at, endsAt: null, geometry: row.geometry_json as WeatherAlert["geometry"] }));
}

export async function listPersistedClientExposures(eventIds: string[]): Promise<ClientExposure[]> {
  if (!eventIds.length) return [];
  const opportunities = await supabaseRest<PersistedOpportunity[]>(`weather_opportunities?select=id,weather_event_id&weather_event_id=in.${inFilter(eventIds)}`);
  if (!opportunities.length) return [];
  const rows = await supabaseRest<PersistedExposure[]>(`weather_client_exposures?select=weather_opportunity_id,client_id,branch_id,exposure_status,distance_km,methodology&weather_opportunity_id=in.${inFilter(opportunities.map((row) => row.id))}&exposure_status=in.(direct,near)`);
  const branches = await listInternalBranchLocations();
  const branchById = new Map(branches.map((row) => [row.branchId, row]));
  const eventByOpportunity = new Map(opportunities.map((row) => [row.id, row.weather_event_id]));
  return rows.flatMap((row) => {
    const branch = branchById.get(row.branch_id);
    const weatherOpportunityId = eventByOpportunity.get(row.weather_opportunity_id);
    if (!branch || !weatherOpportunityId || branch.clientId !== row.client_id) return [];
    return [{ ...branch, weatherOpportunityId, status: row.exposure_status, distanceKm: row.distance_km, methodology: row.methodology }];
  });
}

export async function persistedWeatherProviderStatus(): Promise<WeatherProviderStatus> {
  const rows = await supabaseRest<RefreshRow[]>("weather_provider_refreshes?select=attempted_at,completed_at,status,sanitized_error&weather_source_id=eq.nws&order=attempted_at.desc&limit=1");
  const latest = rows[0];
  if (!latest) return { provider: "nws", state: "unavailable", lastAttemptedRefresh: new Date(0).toISOString(), lastSuccessfulRefresh: null, stale: true, message: "No governed NWS refresh record is available." };
  const stale = !latest.completed_at || Date.now() - Date.parse(latest.completed_at) > 15 * 60_000;
  return { provider: "nws", state: latest.status === "succeeded" ? stale ? "degraded" : "operational" : "unavailable", lastAttemptedRefresh: latest.attempted_at, lastSuccessfulRefresh: latest.status === "succeeded" ? latest.completed_at : null, stale, message: latest.status === "succeeded" ? stale ? "The latest governed NWS refresh is stale; controlled refresh is required." : "The latest governed NWS refresh completed successfully." : latest.sanitized_error ?? "The latest governed NWS refresh failed." };
}
