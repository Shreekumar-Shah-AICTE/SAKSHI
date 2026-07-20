import type { FieldPolygon, GeofenceResult, LatLng } from "./types";

/**
 * SAKSHI — geofencing (part of gravity component #1).
 *
 * Deterministic, dependency-free point-in-polygon test plus a metric distance
 * to the field boundary. The evidence pipeline uses this to prove a photo was
 * taken *inside the registered field polygon* — closing the "borrowed a
 * neighbour's disaster photo" loophole before anything gets sealed.
 */

const EARTH_RADIUS_M = 6_371_008.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in metres (haversine). */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Project lat/lng to a local planar frame (equirectangular) centred on `origin`
 * so we can do fast, accurate-at-field-scale euclidean geometry in metres.
 */
function toLocalMeters(p: LatLng, origin: LatLng): { x: number; y: number } {
  const x = toRad(p.lng - origin.lng) * Math.cos(toRad(origin.lat)) * EARTH_RADIUS_M;
  const y = toRad(p.lat - origin.lat) * EARTH_RADIUS_M;
  return { x, y };
}

/** Standard ray-casting point-in-polygon test in the local planar frame. */
function pointInRing(
  pt: { x: number; y: number },
  ring: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const intersects =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Shortest distance (metres) from a planar point to a segment. */
function pointToSegmentM(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Test a GPS fix against a registered field polygon.
 *
 * Returns whether the point is inside and the distance to the nearest boundary
 * edge in metres (0 when inside). The distance is what powers the "within X m
 * of the field" reason on the receipt — and the reject-with-reason UX when a
 * capture is clearly outside the field.
 */
export function geofence(point: LatLng, field: FieldPolygon): GeofenceResult {
  if (field.ring.length < 3) {
    return { polygonId: field.id, inside: false, distanceM: Infinity };
  }

  const origin = field.ring[0];
  const localRing = field.ring.map((v) => toLocalMeters(v, origin));
  const localPt = toLocalMeters(point, origin);

  const inside = pointInRing(localPt, localRing);

  let minDist = Infinity;
  for (let i = 0, j = localRing.length - 1; i < localRing.length; j = i++) {
    const d = pointToSegmentM(localPt, localRing[j], localRing[i]);
    if (d < minDist) minDist = d;
  }

  return {
    polygonId: field.id,
    inside,
    distanceM: inside ? 0 : Math.round(minDist * 10) / 10,
  };
}

/** Approximate area of a field polygon in hectares (shoelace, planar frame). */
export function polygonAreaHa(field: FieldPolygon): number {
  if (field.ring.length < 3) return 0;
  const origin = field.ring[0];
  const ring = field.ring.map((v) => toLocalMeters(v, origin));
  let area2 = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area2 += ring[j].x * ring[i].y - ring[i].x * ring[j].y;
  }
  const areaM2 = Math.abs(area2) / 2;
  return Math.round((areaM2 / 10_000) * 100) / 100;
}

/** Centroid of a field polygon (average of vertices). */
export function polygonCentroid(field: FieldPolygon): LatLng {
  const n = field.ring.length;
  const sum = field.ring.reduce(
    (acc, v) => ({ lat: acc.lat + v.lat, lng: acc.lng + v.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / n, lng: sum.lng / n };
}
