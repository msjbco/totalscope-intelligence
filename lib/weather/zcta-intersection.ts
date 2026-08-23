import type { GeoJsonGeometry } from "@/lib/weather/contracts";
import { pointInsideGeometry } from "@/lib/weather/exposure";

export type ZctaGeography = { zcta: string; geometry: GeoJsonGeometry; sourceVersion: string };
export type ZctaIntersectionResult = { status: "available"; zctas: string[]; methodology: string } | { status: "unavailable"; zctas: []; methodology: string };

function vertices(geometry: GeoJsonGeometry): [number, number][] {
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "Polygon") return geometry.coordinates.flat() as [number, number][];
  return geometry.coordinates.flat(2) as [number, number][];
}

function orientation(a: [number, number], b: [number, number], c: [number, number]) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  return Math.abs(value) < 1e-10 ? 0 : Math.sign(value);
}

function segmentsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
  const onSegment = (left: [number, number], point: [number, number], right: [number, number]) => point[0] <= Math.max(left[0], right[0]) && point[0] >= Math.min(left[0], right[0]) && point[1] <= Math.max(left[1], right[1]) && point[1] >= Math.min(left[1], right[1]);
  const o1 = orientation(a, b, c); const o2 = orientation(a, b, d); const o3 = orientation(c, d, a); const o4 = orientation(c, d, b);
  return (o1 !== o2 && o3 !== o4) || (o1 === 0 && onSegment(a, c, b)) || (o2 === 0 && onSegment(a, d, b)) || (o3 === 0 && onSegment(c, a, d)) || (o4 === 0 && onSegment(c, b, d));
}

function edges(geometry: GeoJsonGeometry): [[number, number], [number, number]][] {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.flat() : [];
  return rings.flatMap((ring) => ring.slice(1).map((point, index) => [ring[index] as [number, number], point as [number, number]]));
}

export function geometriesIntersect(left: GeoJsonGeometry, right: GeoJsonGeometry) {
  if (vertices(left).some((point) => pointInsideGeometry(point, right))) return true;
  if (vertices(right).some((point) => pointInsideGeometry(point, left))) return true;
  return edges(left).some(([a, b]) => edges(right).some(([c, d]) => segmentsIntersect(a, b, c, d)));
}

export function intersectOpportunityZctas(geometries: GeoJsonGeometry[], zctas: ZctaGeography[]): ZctaIntersectionResult {
  if (!geometries.length) return { status: "unavailable", zctas: [], methodology: "Unable to determine from available storm geometry." };
  const matches = [...new Set(zctas.filter((zcta) => geometries.some((geometry) => geometriesIntersect(geometry, zcta.geometry))).map((zcta) => zcta.zcta))].sort();
  return { status: "available", zctas: matches, methodology: "Approximation from intersection with Census ZCTA geography; USPS ZIP Codes and Census ZCTAs are not identical." };
}
