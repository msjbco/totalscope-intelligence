import type { ContractorProspect, GeoJsonGeometry, WeatherProviderStatus } from "@/lib/weather/contracts";

export type ContractorSearch = {
  geometry: GeoJsonGeometry;
  radiusKm: number;
  categories: string[];
};

export interface ContractorDiscoveryProvider {
  readonly id: string;
  searchContractorsNearGeometry(search: ContractorSearch): Promise<ContractorProspect[]>;
  getContractorDetails(providerBusinessId: string): Promise<ContractorProspect | null>;
  providerHealth(): Promise<WeatherProviderStatus>;
}

export class UnconfiguredContractorDiscoveryProvider implements ContractorDiscoveryProvider {
  readonly id = "unconfigured";

  async searchContractorsNearGeometry(): Promise<ContractorProspect[]> {
    throw new Error("Contractor discovery is not configured. No live prospect results are available.");
  }

  async getContractorDetails(): Promise<null> {
    return null;
  }

  async providerHealth(): Promise<WeatherProviderStatus> {
    const now = new Date().toISOString();
    return {
      provider: this.id,
      state: "not_configured",
      lastAttemptedRefresh: now,
      lastSuccessfulRefresh: null,
      stale: true,
      message: "A licensed contractor-discovery provider credential has not been configured.",
    };
  }
}
