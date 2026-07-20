import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAKSHI · साक्षी — the unerasable witness",
  description:
    "SAKSHI is the tamper-proof witness to a farmer's crop loss — sealed in 10 seconds, in their own language, corroborated by satellite + weather no one can bribe.",
  applicationName: "SAKSHI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "SAKSHI · साक्षी — the unerasable witness",
    description:
      "The farmer seals the loss the instant it happens, corroborated by two sources no one can bribe.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1120",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-vault min-h-screen antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').catch(function(){});
              });
            }`,
          }}
        />
      </body>
    </html>
  );
}
