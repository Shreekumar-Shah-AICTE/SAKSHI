import QRCode from "qrcode";

/**
 * Generate a QR code as a PNG data URL pointing at the public verifier for a
 * receipt. Rendered server-side so no client JS is needed to show it.
 */
export async function verifyQrDataUrl(baseUrl: string, receiptHash: string): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/verify/${receiptHash}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
    color: { dark: "#0b1120", light: "#ffce6b" },
  });
}

/** Resolve the public base URL for building QR/verify links. */
export function resolveBaseUrl(headersHost?: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (headersHost) {
    const proto = headersHost.startsWith("localhost") || headersHost.startsWith("127.") ? "http" : "https";
    return `${proto}://${headersHost}`;
  }
  return "http://localhost:3000";
}
