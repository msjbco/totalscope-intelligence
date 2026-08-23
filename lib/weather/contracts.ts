export type GeoJsonGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type WeatherLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
};

export type WeatherProvenance = {
  provider: string;
  sourceId: string;
  sourceUrl: string;
  sourceTimestamp: string;
  retrievedAt: string;
};

export type WeatherAlert = WeatherProvenance & {
  kind: "alert";
  event: string;
  status: string;
  messageType: string;
  severity: string | null;
  certainty: string | null;
  urgency: string | null;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  areaDescription: string | null;
  issuedAt: string;
  effectiveAt: string;
  onsetAt: string | null;
  expiresAt: string;
  endsAt: string | null;
  geometry: GeoJsonGeometry | null;
  affectedZctas?: string[];
  zctaStatus?: "available" | "unavailable";
  zctaMethodology?: string;
  zctaDatasetVersion?: string | null;
};

export type ForecastPeriod = {
  name: string;
  startTime: string;
  endTime: string;
  temperature: number | null;
  temperatureUnit: string | null;
  windSpeed: string | null;
  windDirection: string | null;
  shortForecast: string;
  detailedForecast: string;
  precipitationProbabilityPercent: number | null;
};

export type WeatherForecast = WeatherProvenance & {
  kind: "forecast";
  location: WeatherLocation;
  periods: ForecastPeriod[];
};

export type HourlyWeatherForecast = WeatherForecast & { kind: "forecast" };

export type ProviderState = "operational" | "degraded" | "unavailable" | "not_configured";

export type WeatherProviderStatus = {
  provider: string;
  state: ProviderState;
  lastAttemptedRefresh: string;
  lastSuccessfulRefresh: string | null;
  stale: boolean;
  message: string;
};

export type OpportunityLevel = "monitor" | "elevated" | "high" | "active";
export type NormalizedWeatherEventType = "Hail" | "Damaging / Extreme Wind" | "Severe Convective" | "Tornado" | "Tropical / Hurricane" | "Flooding" | "Winter / Ice" | "Other";
export type WeatherEvidence = { hailSupported: boolean; hailSizeInches: number | null; damagingWindSupported: boolean; maximumWindMph: number | null };
export type WeatherSeverityAssessment = { score: number; label: "Minor" | "Moderate" | "Severe" | "Extreme"; sourceSeverity: string | null };
export type WeatherOpportunityScoreComponent = { key: string; label: string; points: number; source: "event" | "evidence" | "certainty" | "urgency" };
export type WeatherOpportunityAssessment = { modelVersion: "weather_opportunity_v1"; score: number; label: "Low" | "Moderate" | "High" | "Very high"; normalizedEventType: NormalizedWeatherEventType; rationale: string[]; breakdown: WeatherOpportunityScoreComponent[]; evidence: WeatherEvidence };
export type FutureTotalScopeOpportunityInputs = { weatherOpportunity: WeatherOpportunityAssessment; clientExposure: null; prospectMarketOpportunity: null };

export type WeatherOpportunity = {
  id: string;
  title: string;
  level: OpportunityLevel;
  rationale: string[];
  alert: WeatherAlert;
};

export type AggregatedWeatherOpportunity = {
  id: string;
  title: string;
  eventFamily: string;
  level: OpportunityLevel;
  sourceAlerts: WeatherAlert[];
  sourceAlertIds: string[];
  startsAt: string;
  endsAt: string;
  affectedGeography: string[];
  strongestIndicator: string;
  focusCoordinate: [number, number] | null;
  normalizedEventType: NormalizedWeatherEventType;
  weatherOpportunity: WeatherOpportunityAssessment;
  weatherSeverity: WeatherSeverityAssessment;
  affectedZctas: string[];
  zctaStatus: "available" | "unavailable";
  zctaMethodology: string;
  zctaDatasetVersion: string | null;
};

export type ClientExposureStatus = "direct" | "near" | "outside" | "unknown";
export type LocationPrecision = "rooftop" | "parcel" | "interpolated_address" | "street" | "zip" | "city" | "unknown";

export type ClientBranchLocation = {
  clientId: string;
  branchId: string;
  clientName: string;
  branchName: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  locationPrecision: LocationPrecision;
};

export type ClientExposure = ClientBranchLocation & {
  weatherOpportunityId: string;
  status: ClientExposureStatus;
  distanceKm: number | null;
  methodology: string;
};

export type ExistingClientMatchStatus =
  | "not_existing_client"
  | "possible_existing_client"
  | "confirmed_existing_client";

export type KnownClientRelationshipStatus =
  | "current_client"
  | "inactive_client"
  | "deleted_former_client"
  | "no_known_client_relationship";

export type ContractorProspect = {
  provider: string;
  providerBusinessId: string;
  name: string;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceFromStormKm: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  contactName: string | null;
  category: string | null;
  sourceReference: string | null;
  retrievedAt: string;
  lastRefreshedAt: string;
  completeness: "complete" | "partial" | "minimal";
  matchStatus: ExistingClientMatchStatus;
  matchRationale: string[];
};

export type WeatherIntelligenceSnapshot = {
  generatedAt: string;
  providerStatus: WeatherProviderStatus;
  contractorProviderStatus: WeatherProviderStatus;
  alerts: WeatherAlert[];
  forecasts: WeatherForecast[];
  opportunities: WeatherOpportunity[];
  monitoredLocations: WeatherLocation[];
  clientExposures: ClientExposure[];
  prospects: ContractorProspect[];
  errors: string[];
};
