import type { AggregatedWeatherOpportunity, ClientExposure, GeoJsonGeometry, WeatherLocation } from "@/lib/weather/contracts";

export type WeatherMapFeature = {
  id?: string | number;
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown> | null;
};

export type WeatherMapFeatureCollection = {
  type: "FeatureCollection";
  features: WeatherMapFeature[];
};

const US_BOUNDS = { west: -125, east: -66, south: 24, north: 50 } as const;
const US_VIEWBOX = { width: 1000, height: 560 } as const;
const STATE_REFERENCE_COORDINATES: Record<string, [number, number]> = {
  AL: [-86.8, 32.8], AK: [-152.4, 64.2], AZ: [-111.9, 34.3], AR: [-92.4, 34.9], CA: [-119.7, 37.2], CO: [-105.5, 39.0], CT: [-72.7, 41.6], DE: [-75.5, 39.0], FL: [-82.5, 28.6], GA: [-83.4, 32.7], HI: [-157.5, 20.8], ID: [-114.4, 44.2], IL: [-89.2, 40.0], IN: [-86.1, 39.9], IA: [-93.5, 42.1], KS: [-98.4, 38.5], KY: [-85.3, 37.5], LA: [-92.0, 31.0], ME: [-69.0, 45.3], MD: [-76.7, 39.0], MA: [-71.8, 42.3], MI: [-85.4, 44.3], MN: [-94.3, 46.3], MS: [-89.7, 32.7], MO: [-92.5, 38.5], MT: [-109.6, 47.0], NE: [-99.8, 41.5], NV: [-116.6, 39.3], NH: [-71.6, 43.7], NJ: [-74.7, 40.1], NM: [-106.1, 34.4], NY: [-75.5, 42.9], NC: [-79.4, 35.5], ND: [-100.5, 47.5], OH: [-82.8, 40.3], OK: [-97.5, 35.6], OR: [-120.6, 43.9], PA: [-77.7, 40.9], RI: [-71.5, 41.7], SC: [-80.9, 33.8], SD: [-100.2, 44.4], TN: [-86.4, 35.9], TX: [-99.3, 31.5], UT: [-111.7, 39.3], VT: [-72.7, 44.1], VA: [-78.7, 37.5], WA: [-120.7, 47.4], WV: [-80.6, 38.6], WI: [-89.8, 44.6], WY: [-107.6, 43.0], DC: [-77.0, 38.9],
};
const STATE_NAMES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
};
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

export function geometrySvgPath(geometry: GeoJsonGeometry): string | null {
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
    features: opportunities.flatMap((opportunity) => {
      const official = opportunity.sourceAlerts.flatMap((alert) => alert.geometry ? [{
        type: "Feature" as const,
        geometry: alert.geometry,
        properties: { opportunityId: opportunity.id, level: opportunity.level, title: opportunity.title, representation: "official-nws-geometry" },
      }] : []);
      if (official.length) return official;
      return opportunityStateReferences(opportunity).map(({ stateCode, coordinates }) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates },
        properties: { opportunityId: opportunity.id, level: opportunity.level, title: opportunity.title, representation: "source-area-reference", stateCode },
      }));
    }),
  };
}

export function opportunityStateReferences(opportunity: AggregatedWeatherOpportunity): { stateCode: string; coordinates: [number, number] }[] {
  const codes = new Set<string>();
  for (const area of opportunity.affectedGeography) {
    for (const match of area.matchAll(/(?:,|\b)\s*([A-Z]{2})(?=\b)/g)) if (STATE_REFERENCE_COORDINATES[match[1]]) codes.add(match[1]);
    for (const [name, code] of Object.entries(STATE_NAMES)) {
      if (new RegExp(`\\b${name.replaceAll(" ", "\\s+")}\\b`, "i").test(area)) codes.add(code);
    }
  }
  return [...codes].sort().map((stateCode) => ({ stateCode, coordinates: STATE_REFERENCE_COORDINATES[stateCode] }));
}

export function opportunityMapRepresentation(opportunity: AggregatedWeatherOpportunity): "official-nws-geometry" | "source-area-reference" | "unavailable" {
  if (opportunity.sourceAlerts.some((alert) => alert.geometry !== null)) return "official-nws-geometry";
  return opportunityStateReferences(opportunity).length ? "source-area-reference" : "unavailable";
}

export function buildOperationalPointFeatures(locations: WeatherLocation[], exposures: ClientExposure[]): WeatherMapFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      ...locations.map((location) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [location.longitude, location.latitude] as [number, number] }, properties: { kind: "monitored", label: location.name } })),
      ...exposures.flatMap((exposure) => exposure.latitude == null || exposure.longitude == null ? [] : [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [exposure.longitude, exposure.latitude] as [number, number] }, properties: { kind: "client", label: `${exposure.clientName} · ${exposure.branchName}` } }]),
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
  if (!points.length) points.push(...opportunityStateReferences(opportunity).map((reference) => reference.coordinates));
  if (!points.length) return null;
  return points.reduce<[[number, number], [number, number]]>((result, [longitude, latitude]) => [
    [Math.min(result[0][0], longitude), Math.min(result[0][1], latitude)],
    [Math.max(result[1][0], longitude), Math.max(result[1][1], latitude)],
  ], [[Infinity, Infinity], [-Infinity, -Infinity]]);
}
