import "server-only";
import type { GeocodeRequest, GeocodeResult, GeocodingProvider } from "@/lib/geocoding/contracts";
import { normalizeGeocodioResponse } from "@/scripts/geocoding/geocodio-core.mjs";

export class GeocodioGeocodingProvider implements GeocodingProvider {
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {
    if (!apiKey) throw new Error("GEOCODIO_API_KEY is required");
  }
  async geocodeAddress(request: GeocodeRequest): Promise<GeocodeResult> {
    const query = [request.streetAddress, request.city, request.stateCode, request.postalCode, request.countryCode].filter(Boolean).join(", ");
    const url = new URL("https://api.geocod.io/v2/geocode");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", this.apiKey);
    const response = await this.fetcher(url, { signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Geocodio request failed with HTTP ${response.status}`);
    return normalizeGeocodioResponse(request, await response.json()) as GeocodeResult;
  }
  async providerHealth() { return { status: "available" as const, explanation: "Geocodio server-side adapter is configured." }; }
}
