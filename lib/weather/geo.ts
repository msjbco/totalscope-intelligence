import type { GeoJsonGeometry } from "@/lib/weather/contracts";

const EARTH_RADIUS_KM = 6371.0088;

function radians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(a: [number, number], b: [number, number]) {
  const [aLon, aLat] = a;
  const [bLon, bLat] = b;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(value));
}

function segmentDistanceKm(point: [number, number], start: [number, number], end: [number, number]) {
  const referenceLatitude = radians(point[1]);
  const project = ([longitude, latitude]: [number, number]): [number, number] => [radians(longitude - point[0]) * Math.cos(referenceLatitude) * EARTH_RADIUS_KM, radians(latitude - point[1]) * EARTH_RADIUS_KM];
  const [ax, ay] = project(start); const [bx, by] = project(end);
  const denominator = (bx - ax) ** 2 + (by - ay) ** 2;
  const t = denominator === 0 ? 0 : Math.max(0, Math.min(1, -(ax * (bx - ax) + ay * (by - ay)) / denominator));
  return Math.hypot(ax + t * (bx - ax), ay + t * (by - ay));
}

export function distanceToGeometryKm(point: [number, number], geometry: GeoJsonGeometry) {
  if (geometry.type === "Point") return haversineDistanceKm(point, geometry.coordinates);
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  return Math.min(...rings.flatMap((ring) => ring.slice(1).map((end, index) => segmentDistanceKm(point, ring[index] as [number, number], end as [number, number]))));
}
