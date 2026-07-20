import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * The Gravity Core is pure, framework-free TypeScript, so the tests run in a
 * plain Node environment with no browser/React machinery. This keeps the proof
 * (hash-chain + corroboration engine) fast, deterministic and legible.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
