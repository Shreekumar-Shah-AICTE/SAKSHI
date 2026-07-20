import type { GpsFix } from "@/core/types";

/**
 * SAKSHI — EXIF/GPS extraction adapter.
 *
 * On a real capture, the photo carries EXIF GPS + timestamp. This adapter uses
 * `exifr` to parse those out of an uploaded file. If a browser capture has no
 * EXIF GPS (common on live camera streams), the app supplies the device
 * Geolocation fix instead — so the pipeline always has a coordinate to geofence.
 *
 * Kept out of the pure core (which stays dependency-free); the core's geofence
 * consumes whatever coordinate this resolves.
 */

export interface ExtractedCapture {
  gps: GpsFix | null;
  capturedAt: string | null;
  source: "exif" | "device" | "none";
}

export async function extractFromImage(bytes: ArrayBuffer): Promise<ExtractedCapture> {
  try {
    // Dynamic import keeps exifr out of any bundle that doesn't need it.
    const exifr = (await import("exifr")).default;
    const data = await exifr.parse(bytes, { gps: true, pick: ["latitude", "longitude", "DateTimeOriginal", "GPSHorizontalError"] });
    if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
      return {
        gps: {
          lat: data.latitude,
          lng: data.longitude,
          accuracyM: typeof data.GPSHorizontalError === "number" ? data.GPSHorizontalError : undefined,
        },
        capturedAt: data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toISOString() : null,
        source: "exif",
      };
    }
  } catch {
    // fall through to "none"; caller supplies the device fix.
  }
  return { gps: null, capturedAt: null, source: "none" };
}

/** Merge EXIF GPS (preferred) with a device Geolocation fallback. */
export function resolveCaptureGps(
  exif: ExtractedCapture,
  deviceFix: GpsFix | null,
): { gps: GpsFix | null; source: "exif" | "device" | "none" } {
  if (exif.gps) return { gps: exif.gps, source: "exif" };
  if (deviceFix) return { gps: deviceFix, source: "device" };
  return { gps: null, source: "none" };
}
