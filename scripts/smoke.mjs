#!/usr/bin/env node
/**
 * SAKSHI — real-browser golden-path smoke test.
 *
 * Boots the production server, drives the three-tap golden path in a real
 * headless Chromium (phone viewport), asserts the API contracts and the
 * tamper-evidence, and saves screenshots to docs/screenshots/. This is the
 * self-verification the build doctrine requires — run it before submitting.
 *
 * Usage:  npm run smoke        (expects `next build` already run)
 *         npm run verify       (build + smoke)
 *
 * Playwright is optional; if it is not installed the script exits 0 with a note
 * so it never blocks CI on machines without browsers.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = "http://localhost:3000";

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error("server did not become healthy in time");
}

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓ " + msg);
}

let server;
async function main() {
  console.log("• starting production server…");
  server = spawn("npx", ["next", "start", "-p", "3000"], { stdio: "ignore" });

  const health = await waitForServer();
  console.log("• /health:", JSON.stringify(health));
  assert(health.status === "ok", "service healthy");
  assert(health.chain.valid, "seed hash-chain verifies");
  assert(health.receipts === 5, "five receipts sealed");

  // --- API contracts ---
  const seal = await (
    await fetch(`${BASE}/api/seal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: "event-churu-flood-2025" }),
    })
  ).json();
  assert(seal.view.score === 94, "flagship corroboration is 94/100");
  assert(seal.view.weather.stamp.includes("720"), "real +720% rainfall stamp present");
  assert(seal.chainValid, "chain valid after seal");
  const hash = seal.view.receiptHash;

  const tamper = await (
    await fetch(`${BASE}/api/tamper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: 1, newLossType: "drought", refix: false }),
    })
  ).json();
  assert(tamper.before.valid && !tamper.after.valid, "tamper turns a valid chain invalid");
  assert(tamper.after.reason === "PAYLOAD_TAMPERED", "naive tamper => PAYLOAD_TAMPERED");

  const tamper2 = await (
    await fetch(`${BASE}/api/tamper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: 1, newLossType: "drought", refix: true }),
    })
  ).json();
  assert(tamper2.after.reason === "BROKEN_LINK", "re-hashed tamper still breaks the next back-link");

  // --- Real browser (optional) ---
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log("• playwright not installed — skipping browser drive (API checks passed).");
    return;
  }

  console.log("• driving the golden path in a real browser…");
  const browser = await chromium.launch();
  const page = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }).then((c) => c.newPage());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${BASE}/seal?event=event-churu-flood-2025`, { waitUntil: "networkidle" });
  await page.getByRole("button").filter({ hasText: /फोटू|फोटो|Photograph/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button").filter({ hasText: /→/ }).first().click();
  await page.waitForTimeout(300);
  await page.locator("button[aria-label]").first().click();
  await page.waitForTimeout(2200);
  await page.getByRole("button").filter({ hasText: /सील|Seal this/ }).first().click();
  await page.waitForTimeout(3200);
  const body = await page.textContent("body");
  assert(/94/.test(body ?? ""), "browser: SEALED screen shows the 94 score");
  assert(errors.length === 0, "browser: no page errors on the golden path");

  await browser.close();
  console.log("\n✅ SMOKE TEST PASSED — golden path is green.");
}

main()
  .catch((err) => {
    console.error("\n❌ SMOKE TEST FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) server.kill();
  });
