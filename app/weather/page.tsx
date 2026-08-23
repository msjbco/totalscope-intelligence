import { DashboardShell } from "@/components/dashboard/shell";
import { WeatherDashboard } from "@/components/dashboard/weather-dashboard";
import { LiveWeatherDashboard } from "@/components/dashboard/live-weather-dashboard";
import { getDataMode } from "@/lib/data/config";
import { getLiveWeatherIntelligence } from "@/lib/weather/service";

export default async function Page() {
  const mode = getDataMode();
  const content = mode === "live"
    ? <LiveWeatherDashboard snapshot={await getLiveWeatherIntelligence()} />
    : <WeatherDashboard />;
  return <DashboardShell title="Weather Intelligence Beta" eyebrow="TOTALSCOPE INTERNAL" mode={mode} showFilters={mode === "demo"}>{content}</DashboardShell>;
}
