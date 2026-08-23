import "server-only";

import { supabaseRest } from "@/lib/data/supabase-rest";

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

export async function listLiveWeatherAlerts() {
  return supabaseRest<LiveWeatherAlert[]>(
    "weather_internal_active_alerts?select=id,provider_event_id,lifecycle_status,event_name,severity,certainty,urgency,headline,area_description,effective_at,onset_at,expires_at,geometry_json,source_observed_at,retrieved_at,source_url&order=urgency.desc,effective_at.desc",
  );
}
