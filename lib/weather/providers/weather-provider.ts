import type {
  HourlyWeatherForecast,
  WeatherAlert,
  WeatherForecast,
  WeatherLocation,
  WeatherProviderStatus,
} from "@/lib/weather/contracts";

export interface WeatherProvider {
  readonly id: string;
  getForecast(location: WeatherLocation): Promise<WeatherForecast>;
  getHourlyForecast(location: WeatherLocation): Promise<HourlyWeatherForecast>;
  getActiveAlerts(): Promise<WeatherAlert[]>;
  getObservations?(location: WeatherLocation): Promise<unknown[]>;
  providerHealth(): Promise<WeatherProviderStatus>;
}
