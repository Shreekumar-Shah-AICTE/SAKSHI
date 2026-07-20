import { describe, it, expect } from "vitest";
import { geofence, haversineM, polygonAreaHa, polygonCentroid } from "./geofence";
import type { FieldPolygon } from "./types";

// A ~0.8 ha field around Sunita Devi's Khasra 214 in Churu (real coordinates).
const field: FieldPolygon = {
  id: "field-churu-214",
  ring: [
    { lat: 28.296 + 0.00042, lng: 74.966 - 0.00048 },
    { lat: 28.296 + 0.00042, lng: 74.966 + 0.00048 },
    { lat: 28.296 - 0.00042, lng: 74.966 + 0.00048 },
    { lat: 28.296 - 0.00042, lng: 74.966 - 0.00048 },
  ],
};

describe("haversineM", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineM({ lat: 28.296, lng: 74.966 }, { lat: 28.296, lng: 74.966 })).toBeCloseTo(0, 5);
  });

  it("matches a known ~1 degree latitude distance (~111 km)", () => {
    const d = haversineM({ lat: 28, lng: 75 }, { lat: 29, lng: 75 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe("geofence", () => {
  it("accepts a capture at the field centre", () => {
    const r = geofence({ lat: 28.296, lng: 74.966 }, field);
    expect(r.inside).toBe(true);
    expect(r.distanceM).toBe(0);
    expect(r.polygonId).toBe("field-churu-214");
  });

  it("rejects a capture clearly outside the field and reports the distance", () => {
    // ~200 m north of the field.
    const r = geofence({ lat: 28.2982, lng: 74.966 }, field);
    expect(r.inside).toBe(false);
    expect(r.distanceM).toBeGreaterThan(100);
    expect(r.distanceM).toBeLessThan(300);
  });

  it("rejects a capture in a different village (the 'borrowed photo' loophole)", () => {
    const r = geofence({ lat: 28.4, lng: 74.5 }, field);
    expect(r.inside).toBe(false);
    expect(r.distanceM).toBeGreaterThan(1000);
  });

  it("treats a degenerate polygon as non-containing", () => {
    const bad: FieldPolygon = { id: "x", ring: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }] };
    expect(geofence({ lat: 1.5, lng: 1.5 }, bad).inside).toBe(false);
  });
});

describe("polygonAreaHa", () => {
  it("computes the field area close to the intended ~0.8 ha", () => {
    const area = polygonAreaHa(field);
    expect(area).toBeGreaterThan(0.7);
    expect(area).toBeLessThan(1.0);
  });
});

describe("polygonCentroid", () => {
  it("returns the geometric centre", () => {
    const c = polygonCentroid(field);
    expect(c.lat).toBeCloseTo(28.296, 4);
    expect(c.lng).toBeCloseTo(74.966, 4);
  });
});
