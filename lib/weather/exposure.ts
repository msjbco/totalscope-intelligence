import type { ClientBranchLocation, ClientExposure, GeoJsonGeometry, WeatherOpportunity } from "@/lib/weather/contracts";
import { distanceToGeometryKm } from "@/lib/weather/geo";

function pointInRing(point: [number, number], ring: number[][]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInsideGeometry(point: [number, number], geometry: GeoJsonGeometry) {
  if (geometry.type === "Point") return point[0] === geometry.coordinates[0] && point[1] === geometry.coordinates[1];
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => pointInRing(point, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(point, hole)));
}

export function evaluateClientExposure(opportunity: WeatherOpportunity, branch: ClientBranchLocation, nearRadiusKm = 50): ClientExposure {
  const geometry = opportunity.alert.geometry;
  const defensiblePrecision = new Set(["rooftop", "parcel", "interpolated_address"]);
  if (!defensiblePrecision.has(branch.locationPrecision)) {
    return { ...branch, weatherOpportunityId: opportunity.id, status: "unknown", distanceKm: null, methodology: `Location precision ${branch.locationPrecision} is insufficient for point-level exposure` };
  }
  if (!geometry || branch.latitude == null || branch.longitude == null) {
    return { ...branch, weatherOpportunityId: opportunity.id, status: "unknown", distanceKm: null, methodology: "Insufficient provider or branch geometry" };
  }
  const point: [number, number] = [branch.longitude, branch.latitude];
  if (pointInsideGeometry(point, geometry)) {
    return { ...branch, weatherOpportunityId: opportunity.id, status: "direct", distanceKm: 0, methodology: "Branch point intersects provider alert polygon" };
  }
  const distanceKm = distanceToGeometryKm(point, geometry);
  return { ...branch, weatherOpportunityId: opportunity.id, status: distanceKm <= nearRadiusKm ? "near" : "outside", distanceKm, methodology: distanceKm <= nearRadiusKm ? `Nearest provider geometry boundary within ${nearRadiusKm} km` : `Outside ${nearRadiusKm} km review radius` };
}
