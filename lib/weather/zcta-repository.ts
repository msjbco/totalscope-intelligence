import "server-only";

import type { WeatherAlert } from "@/lib/weather/contracts";
import { requirePublicSupabaseEnvironment } from "@/lib/data/config";
import { createClient } from "@/lib/supabase/server";

type ZctaRpcRow = { source_id: string; available: boolean; zctas: string[]; methodology: string; dataset_version: string | null };

export async function attachAffectedZctas(alerts: WeatherAlert[]) {
  if (!alerts.length) return alerts;
  const { url, anonKey } = requirePublicSupabaseEnvironment();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Authenticated session is unavailable for governed ZCTA intersection.");
  const response = await fetch(`${url}/rest/v1/rpc/get_weather_affected_zctas`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_alerts: alerts.map((alert) => ({ source_id: alert.sourceId, geometry: alert.geometry })),
      p_minimum_area_square_meters: 10_000,
      p_minimum_zcta_fraction: 0.0001,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Governed ZCTA intersection is unavailable (${response.status}).`);
  const bySource = new Map((await response.json() as ZctaRpcRow[]).map((row) => [row.source_id, row]));
  return alerts.map((alert) => {
    const row = bySource.get(alert.sourceId);
    return { ...alert, affectedZctas: row?.zctas ?? [], zctaStatus: row?.available ? "available" as const : "unavailable" as const, zctaMethodology: row?.methodology ?? "Unable to determine affected ZIP areas from available storm geometry.", zctaDatasetVersion: row?.dataset_version ?? null };
  });
}
