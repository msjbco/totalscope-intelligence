import "server-only";

import { classifyAlert } from "@/lib/weather/classification";
import type { WeatherIntelligenceSnapshot, WeatherLocation } from "@/lib/weather/contracts";
import { UnconfiguredContractorDiscoveryProvider } from "@/lib/weather/providers/contractor-discovery-provider";
import { NWSWeatherProvider } from "@/lib/weather/providers/nws-weather-provider";
import { parseMonitoredLocations } from "@/lib/weather/config";
import { attachAffectedZctas } from "@/lib/weather/zcta-repository";
import { listLiveWeatherAlerts, listPersistedClientExposures, persistedWeatherProviderStatus } from "@/lib/weather/live-weather-repository";

export async function getLiveWeatherIntelligence(): Promise<WeatherIntelligenceSnapshot> {
  const weather = new NWSWeatherProvider();
  const contractor = new UnconfiguredContractorDiscoveryProvider();
  const errors: string[] = [];
  let alerts: WeatherIntelligenceSnapshot["alerts"] = [];
  let forecasts: WeatherIntelligenceSnapshot["forecasts"] = [];

  try { alerts = await listLiveWeatherAlerts(); }
  catch (error) { errors.push(error instanceof Error ? `Persisted NWS alerts are unavailable: ${error.message}` : "Persisted NWS alerts are unavailable."); }
  if (alerts.length) {
    try { alerts = await attachAffectedZctas(alerts); }
    catch (error) { errors.push(error instanceof Error ? error.message : "Governed ZCTA intersection is unavailable."); }
  }

  let locations: WeatherLocation[] = [];
  try { locations = parseMonitoredLocations(process.env.WEATHER_MONITORED_LOCATIONS_JSON); }
  catch (error) { errors.push(error instanceof Error ? error.message : "Monitored locations are unavailable."); }

  if (!locations.length) errors.push("Forecast monitoring is not configured; no location forecasts are shown.");
  if (locations.length) {
    const results = await Promise.allSettled(locations.map((location) => weather.getForecast(location)));
    forecasts = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failures = results.flatMap((result, index) => result.status === "rejected"
      ? [`${locations[index].name}: ${result.reason instanceof Error ? result.reason.message : "Unknown forecast error."}`]
      : []);
    if (failures.length) {
      console.warn(JSON.stringify({ provider: weather.id, operation: "monitored-forecasts", status: "partial-failure", failures }));
      errors.push(`${failures.length} monitored forecast ${failures.length === 1 ? "request" : "requests"} failed: ${failures.join("; ")}`);
    }
  }

  let providerStatus: WeatherIntelligenceSnapshot["providerStatus"];
  try { providerStatus = await persistedWeatherProviderStatus(); }
  catch (error) { providerStatus = { provider: "nws", state: "unavailable", lastAttemptedRefresh: new Date(0).toISOString(), lastSuccessfulRefresh: null, stale: true, message: error instanceof Error ? error.message : "Governed NWS refresh status is unavailable." }; }
  if (!alerts.length && !forecasts.length) {
    providerStatus.state = "unavailable";
    providerStatus.stale = true;
    providerStatus.message = errors[0] ?? "No live weather data is available.";
  }
  const opportunities = alerts.map(classifyAlert).filter((value) => value !== null);
  let clientExposures: WeatherIntelligenceSnapshot["clientExposures"] = [];
  try {
    clientExposures = await listPersistedClientExposures(alerts.map((alert) => alert.sourceId));
  } catch (error) {
    errors.push(error instanceof Error ? `Persisted current-client exposure unavailable: ${error.message}` : "Persisted current-client exposure unavailable.");
  }
  return {
    generatedAt: new Date().toISOString(),
    providerStatus,
    contractorProviderStatus: await contractor.providerHealth(),
    alerts,
    forecasts,
    opportunities,
    monitoredLocations: locations,
    clientExposures,
    prospects: [],
    errors,
  };
}
