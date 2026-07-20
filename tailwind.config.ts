import type { Config } from "tailwindcss";

/**
 * SAKSHI visual identity — deliberately NOT a generic dark dashboard.
 *
 * The palette encodes the emotional "temperature journey" of the app:
 *   night  -> cold distress (the moment of loss)
 *   soil   -> the earth / the field / neutral ground
 *   seal   -> the warm amber/gold glow of protection (SEALED)
 *   ndvi   -> the satellite green -> brown transition (living -> dead crop)
 *
 * Swap the `seal` accent and the product still has a soul because the whole
 * layout, motion and typography carry the identity — that is the VSF gate.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        night: {
          DEFAULT: "#0b1120",
          700: "#111a2e",
          600: "#18233d",
          500: "#22304f",
        },
        soil: {
          900: "#1c130b",
          700: "#3b2a1a",
          500: "#6b4c2f",
          300: "#a9835a",
          100: "#e9dccb",
        },
        seal: {
          DEFAULT: "#f5a524",
          light: "#ffce6b",
          deep: "#c47d10",
          glow: "#ffd77a",
        },
        ndvi: {
          green: "#2fbf5b",
          leaf: "#57d97e",
          fade: "#b9c15a",
          brown: "#8a5a2b",
          dead: "#6b4327",
        },
        verify: {
          DEFAULT: "#38bdf8",
          deep: "#0284c7",
        },
      },
      boxShadow: {
        seal: "0 0 0 1px rgba(245,165,36,0.35), 0 18px 60px -12px rgba(245,165,36,0.45)",
        vault: "0 30px 80px -20px rgba(0,0,0,0.65)",
      },
      keyframes: {
        "seal-thunk": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "55%": { transform: "scale(1.08)", opacity: "1" },
          "70%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "glow-pulse": {
          "0%,100%": { boxShadow: "0 0 0 1px rgba(245,165,36,0.35), 0 18px 60px -12px rgba(245,165,36,0.35)" },
          "50%": { boxShadow: "0 0 0 1px rgba(245,165,36,0.6), 0 22px 80px -8px rgba(245,165,36,0.6)" },
        },
        "rise": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "seal-thunk": "seal-thunk 700ms cubic-bezier(0.22,1,0.36,1) both",
        "glow-pulse": "glow-pulse 3.2s ease-in-out infinite",
        "rise": "rise 500ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
