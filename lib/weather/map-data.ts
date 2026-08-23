import type { AggregatedWeatherOpportunity, ClientExposure, WeatherLocation } from "@/lib/weather/contracts";

export type WeatherMapFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

const US_BOUNDS = { west: -125, east: -66, south: 24, north: 50 } as const;
const US_VIEWBOX = { width: 1000, height: 560 } as const;
export type WeatherMapViewBox = { x: number; y: number; width: number; height: number };
export const NATIONAL_WEATHER_VIEWBOX: WeatherMapViewBox = { x: 0, y: 0, width: US_VIEWBOX.width, height: US_VIEWBOX.height };

export function projectUsCoordinate([longitude, latitude]: number[]): [number, number] {
  const normalizedLongitude = longitude > 0 ? longitude - 360 : longitude;
  if (latitude > 50 && normalizedLongitude < -130) {
    return [45 + ((normalizedLongitude + 180) / 50) * 250, 420 + ((72 - latitude) / 22) * 120];
  }
  if (latitude < 24 && normalizedLongitude < -150) {
    return [325 + ((normalizedLongitude + 161) / 7) * 115, 475 + ((23 - latitude) / 6) * 75];
  }
  if (latitude < 24 && normalizedLongitude > -70) {
    return [800 + ((normalizedLongitude + 68) / 4) * 120, 475 + ((23 - latitude) / 6) * 75];
  }
  return [
    ((normalizedLongitude - US_BOUNDS.west) / (US_BOUNDS.east - US_BOUNDS.west)) * US_VIEWBOX.width,
    ((US_BOUNDS.north - latitude) / (US_BOUNDS.north - US_BOUNDS.south)) * US_VIEWBOX.height,
  ];
}

function ringPath(ring: number[][]): string {
  return ring.map((coordinate, index) => {
    const [x, y] = projectUsCoordinate(coordinate);
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

export function geometrySvgPath(geometry: GeoJSON.Geometry): string | null {
  if (geometry.type === "Polygon") return geometry.coordinates.map(ringPath).join(" ");
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flatMap((polygon) => polygon.map(ringPath)).join(" ");
  return null;
}

export function fitOpportunityViewBox(opportunity: AggregatedWeatherOpportunity, padding = 75): WeatherMapViewBox {
  const bounds = opportunityBounds(opportunity);
  if (!bounds) return NATIONAL_WEATHER_VIEWBOX;
  const [topLeftX, topLeftY] = projectUsCoordinate([bounds[0][0], bounds[1][1]]);
  const [bottomRightX, bottomRightY] = projectUsCoordinate([bounds[1][0], bounds[0][1]]);
  const width = Math.max(180, bottomRightX - topLeftX + padding * 2);
  const height = Math.max(140, bottomRightY - topLeftY + padding * 2);
  return {
    x: Math.max(0, Math.min(US_VIEWBOX.width - width, topLeftX - padding)),
    y: Math.max(0, Math.min(US_VIEWBOX.height - height, topLeftY - padding)),
    width: Math.min(US_VIEWBOX.width, width),
    height: Math.min(US_VIEWBOX.height, height),
  };
}

export function fitOpportunitySetViewBox(opportunities: AggregatedWeatherOpportunity[], padding = 45): WeatherMapViewBox {
  const bounds = opportunities.map(opportunityBounds).filter((value): value is [[number, number], [number, number]] => value !== null);
  if (!bounds.length) return NATIONAL_WEATHER_VIEWBOX;
  const combined = bounds.reduce<[[number, number], [number, number]]>((result, value) => [
    [Math.min(result[0][0], value[0][0]), Math.min(result[0][1], value[0][1])],
    [Math.max(result[1][0], value[1][0]), Math.max(result[1][1], value[1][1])],
  ], [[Infinity, Infinity], [-Infinity, -Infinity]]);
  const [topLeftX, topLeftY] = projectUsCoordinate([combined[0][0], combined[1][1]]);
  const [bottomRightX, bottomRightY] = projectUsCoordinate([combined[1][0], combined[0][1]]);
  const width = Math.min(1000, Math.max(180, bottomRightX - topLeftX + padding * 2));
  const height = Math.min(560, Math.max(140, bottomRightY - topLeftY + padding * 2));
  return { x: Math.max(0, Math.min(1000 - width, topLeftX - padding)), y: Math.max(0, Math.min(560 - height, topLeftY - padding)), width, height };
}

export function buildOpportunityMapFeatures(opportunities: AggregatedWeatherOpportunity[]): WeatherMapFeatureCollection {
  return {
    type: "FeatureCollection",
    features: opportunities.flatMap((opportunity) => opportunity.sourceAlerts.flatMap((alert) => alert.geometry ? [{
      type: "Feature" as const,
      geometry: alert.geometry as GeoJSON.Geometry,
      properties: { opportunityId: opportunity.id, level: opportunity.level, title: opportunity.title },
    }] : [])),
  };
}

export function buildOperationalPointFeatures(locations: WeatherLocation[], exposures: ClientExposure[]): WeatherMapFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      ...locations.map((location) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [location.longitude, location.latitude] }, properties: { kind: "monitored", label: location.name } })),
      ...exposures.flatMap((exposure) => exposure.latitude == null || exposure.longitude == null ? [] : [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [exposure.longitude, exposure.latitude] }, properties: { kind: "client", label: `${exposure.clientName} · ${exposure.branchName}` } }]),
    ],
  };
}

export function opportunityBounds(opportunity: AggregatedWeatherOpportunity): [[number, number], [number, number]] | null {
  const points = opportunity.sourceAlerts.flatMap((alert) => {
    if (!alert.geometry) return [];
    if (alert.geometry.type === "Point") return [alert.geometry.coordinates];
    if (alert.geometry.type === "Polygon") return alert.geometry.coordinates.flat() as [number, number][];
    return alert.geometry.coordinates.flat(2) as [number, number][];
  });
  if (!points.length) return null;
  return points.reduce<[[number, number], [number, number]]>((result, [longitude, latitude]) => [
    [Math.min(result[0][0], longitude), Math.min(result[0][1], latitude)],
    [Math.max(result[1][0], longitude), Math.max(result[1][1], latitude)],
  ], [[Infinity, Infinity], [-Infinity, -Infinity]]);
}
