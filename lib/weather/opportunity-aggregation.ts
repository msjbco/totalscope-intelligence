import type {
  AggregatedWeatherOpportunity,
  GeoJsonGeometry,
  OpportunityLevel,
  WeatherAlert,
} from "@/lib/weather/contracts";
import { classifyAlert } from "@/lib/weather/classification";
import { haversineDistanceKm } from "@/lib/weather/geo";
import { assessWeatherOpportunity, assessWeatherSeverity, normalizeWeatherEvent } from "@/lib/weather/intelligence";

const MAX_CLUSTER_DISTANCE_KM = 125;
const MAX_TIME_GAP_MS = 90 * 60 * 1_000;
const LEVEL_RANK: Record<OpportunityLevel, number> = { monitor: 0, elevated: 1, high: 2, active: 3 };

type Bounds = { west: number; south: number; east: number; north: number };

function coordinates(geometry: GeoJsonGeometry | null): [number, number][] {
  if (!geometry) return [];
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "Polygon") return geometry.coordinates.flat() as [number, number][];
  return geometry.coordinates.flat(2) as [number, number][];
}

function bounds(alert: WeatherAlert): Bounds | null {
  const points = coordinates(alert.geometry);
  if (!points.length) return null;
  return points.reduce<Bounds>((result, [longitude, latitude]) => ({
    west: Math.min(result.west, longitude), south: Math.min(result.south, latitude),
    east: Math.max(result.east, longitude), north: Math.max(result.north, latitude),
  }), { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity });
}

function center(alert: WeatherAlert): [number, number] | null {
  const value = bounds(alert);
  return value ? [(value.west + value.east) / 2, (value.south + value.north) / 2] : null;
}

function geographyRelated(left: WeatherAlert, right: WeatherAlert) {
  const a = bounds(left);
  const b = bounds(right);
  if (a && b) {
    const overlaps = a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
    if (overlaps) return true;
    const aCenter = center(left)!;
    const bCenter = center(right)!;
    return haversineDistanceKm(aCenter, bCenter) <= MAX_CLUSTER_DISTANCE_KM;
  }
  const aArea = left.areaDescription?.trim().toLowerCase();
  const bArea = right.areaDescription?.trim().toLowerCase();
  return Boolean(aArea && bArea && aArea === bArea);
}

function timeRelated(left: WeatherAlert, right: WeatherAlert) {
  const leftStart = Date.parse(left.effectiveAt);
  const leftEnd = Date.parse(left.endsAt ?? left.expiresAt);
  const rightStart = Date.parse(right.effectiveAt);
  const rightEnd = Date.parse(right.endsAt ?? right.expiresAt);
  return leftStart <= rightEnd + MAX_TIME_GAP_MS && rightStart <= leftEnd + MAX_TIME_GAP_MS;
}

function strongestLevel(alerts: WeatherAlert[]) {
  return alerts.reduce<OpportunityLevel>((strongest, alert) => {
    const level = classifyAlert(alert)?.level ?? "monitor";
    return LEVEL_RANK[level] > LEVEL_RANK[strongest] ? level : strongest;
  }, "monitor");
}

function indicator(alerts: WeatherAlert[]) {
  const strongest = [...alerts].sort((left, right) => {
    const levelDifference = LEVEL_RANK[classifyAlert(right)?.level ?? "monitor"] - LEVEL_RANK[classifyAlert(left)?.level ?? "monitor"];
    return levelDifference || left.sourceId.localeCompare(right.sourceId);
  })[0];
  return [strongest.severity, strongest.certainty, strongest.urgency].filter(Boolean).join(" · ") || "Official alert details available";
}

function stableId(values: string[]) {
  let hash = 2_166_136_261;
  for (const character of values.join("\u001f")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return `weather-opportunity-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function buildOpportunity(alerts: WeatherAlert[]): AggregatedWeatherOpportunity {
  const ordered = [...alerts].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const centers = ordered.map(center).filter((value): value is [number, number] => value !== null);
  const focusCoordinate: [number, number] | null = centers.length
    ? [centers.reduce((sum, value) => sum + value[0], 0) / centers.length, centers.reduce((sum, value) => sum + value[1], 0) / centers.length]
    : null;
  const areas = [...new Set(ordered.flatMap((alert) => alert.areaDescription?.split(";") ?? []).map((area) => area.trim()).filter(Boolean))];
  const assessed = ordered.map((alert) => ({ alert, opportunity: assessWeatherOpportunity(alert), severity: assessWeatherSeverity(alert) }));
  const strongestBusiness = [...assessed].sort((left, right) => right.opportunity.score - left.opportunity.score || left.alert.sourceId.localeCompare(right.alert.sourceId))[0];
  const strongestWeather = [...assessed].sort((left, right) => right.severity.score - left.severity.score || left.alert.sourceId.localeCompare(right.alert.sourceId))[0];
  const family = strongestBusiness.opportunity.normalizedEventType;
  return {
    id: stableId(ordered.map((alert) => alert.sourceId)),
    title: areas[0] ? `${family} · ${areas[0]}` : family,
    eventFamily: family,
    level: strongestLevel(ordered),
    sourceAlerts: ordered,
    sourceAlertIds: ordered.map((alert) => alert.sourceId),
    startsAt: ordered.reduce((earliest, alert) => alert.effectiveAt < earliest ? alert.effectiveAt : earliest, ordered[0].effectiveAt),
    endsAt: ordered.reduce((latest, alert) => (alert.endsAt ?? alert.expiresAt) > latest ? (alert.endsAt ?? alert.expiresAt) : latest, ordered[0].endsAt ?? ordered[0].expiresAt),
    affectedGeography: areas,
    strongestIndicator: indicator(ordered),
    focusCoordinate,
    normalizedEventType: family,
    weatherOpportunity: strongestBusiness.opportunity,
    weatherSeverity: strongestWeather.severity,
    affectedZctas: [...new Set(ordered.flatMap((alert) => alert.affectedZctas ?? []))].sort(),
    zctaStatus: ordered.some((alert) => alert.zctaStatus === "available") ? "available" : "unavailable",
    zctaMethodology: ordered.find((alert) => alert.zctaStatus === "available")?.zctaMethodology ?? ordered.find((alert) => alert.zctaMethodology)?.zctaMethodology ?? "Unable to determine affected ZIP areas from available storm geometry.",
    zctaDatasetVersion: ordered.find((alert) => alert.zctaDatasetVersion)?.zctaDatasetVersion ?? null,
  };
}

export function aggregateWeatherOpportunities(alerts: WeatherAlert[], asOf: string, horizonHours: number) {
  const start = Date.parse(asOf);
  const end = start + horizonHours * 60 * 60 * 1_000;
  const material = alerts
    .filter((alert) => classifyAlert(alert) !== null)
    .filter((alert) => Date.parse(alert.endsAt ?? alert.expiresAt) >= start && Date.parse(alert.effectiveAt) <= end)
    .sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt) || a.sourceId.localeCompare(b.sourceId));
  const groups: WeatherAlert[][] = [];
  for (const alert of material) {
    const match = groups.find((group) => group.some((candidate) => normalizeWeatherEvent(candidate) === normalizeWeatherEvent(alert) && timeRelated(candidate, alert) && geographyRelated(candidate, alert)));
    if (match) match.push(alert);
    else groups.push([alert]);
  }
  return groups.map(buildOpportunity).sort((a, b) => b.weatherOpportunity.score - a.weatherOpportunity.score || LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
}
