import type { WeatherLocation } from "@/lib/weather/contracts";

const MAX_MONITORED_LOCATIONS = 25;

export function parseMonitoredLocations(raw: string | undefined): WeatherLocation[] {
  if (!raw) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("WEATHER_MONITORED_LOCATIONS_JSON must contain valid JSON."); }
  if (!Array.isArray(value) || value.length > MAX_MONITORED_LOCATIONS) {
    throw new Error(`WEATHER_MONITORED_LOCATIONS_JSON must be an array of at most ${MAX_MONITORED_LOCATIONS} locations.`);
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Monitored location ${index} must be an object.`);
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.latitude !== "number" || typeof row.longitude !== "number") {
      throw new Error(`Monitored location ${index} requires id, name, latitude, and longitude.`);
    }
    if (row.latitude < -90 || row.latitude > 90 || row.longitude < -180 || row.longitude > 180) {
      throw new Error(`Monitored location ${index} has invalid coordinates.`);
    }
    return { id: row.id, name: row.name, latitude: row.latitude, longitude: row.longitude, state: typeof row.state === "string" ? row.state : undefined };
  });
}
