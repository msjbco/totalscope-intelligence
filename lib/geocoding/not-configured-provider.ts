import type { GeocodeRequest, GeocodeResult, GeocodingProvider } from "@/lib/geocoding/contracts";
export class NotConfiguredGeocodingProvider implements GeocodingProvider {
  async geocodeAddress(request: GeocodeRequest): Promise<GeocodeResult> { void request; return { status:"not_configured",latitude:null,longitude:null,precision:"unknown",providerReference:null,explanation:"No commercially approved geocoding provider is configured." }; }
  async providerHealth() { return { status:"not_configured" as const,explanation:"Geocoding awaits a separately approved provider and credential configuration." }; }
}
