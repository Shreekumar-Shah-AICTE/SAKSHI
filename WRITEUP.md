# WRITEUP.md — SAKSHI · साक्षी

**AI for Bharat 2026 · Build Round · short write-up (tools / APIs / datasets + the moat).**

## What SAKSHI is

A voice-first PWA that lets a farmer **seal** a crop loss into a tamper-evident,
independently-corroborated **Loss Receipt** in about 10 seconds — then have
anyone (ombudsman, DGRC, court, judge) verify it by QR. It attacks the PMFBY
crop-insurance gap where an insurer-controlled survey can be *forged, skipped or
ignored* and genuine losses get marked "zero".

## The moat — VERIFICATION + INTEGRATION

Everyone else builds "AI crop-damage detection to help insurers assess faster."
SAKSHI **inverts who owns the proof.** The defensibility is two deterministic,
non-AI components a rival can't clone in a weekend even after hearing the pitch:

1. **Tamper-evident evidence pipeline** — EXIF/GPS → point-in-polygon geofence →
   canonical SHA-256 → append-only hash-chain → deterministic `verifyChain()`.
2. **Multi-signal corroboration engine** — Sentinel-2 NDVI drop (by growth
   stage) + weather Z-score vs a 10-year baseline + PMFBY 72h window +
   cross-signal integration → 0–100 score with machine-readable reasons.

**Litmus test:** remove every LLM and API — the seal, the chain, and the
corroboration still stand. Both components are pure TypeScript covered by **49
tests** (`src/core/*.test.ts`, `src/data/store.test.ts`).

## The Real Architecture Rule

**architecture REAL · data SEEDED · scale SIMULATED — computation is never faked.**

## Tools

| Layer | Tool | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router) + TypeScript** | One codebase for the PWA UI and the server-side Gravity Core; deploys to Vercel in one click. |
| Styling / motion | **Tailwind CSS**, **Framer Motion** | The SAKSHI visual identity + the 60fps Moment, no heavy UI kit. |
| Crypto | **Node `crypto`** (SHA-256) | Native, auditable, zero-dependency hashing for the chain. |
| EXIF | **`exifr`** | Parse GPS + timestamp from captured photos. |
| QR | **`qrcode`** | Server-rendered QR to the public verifier. |
| Persistence (opt.) | **Supabase (Postgres, RLS)** | Real schema for the 7 tables; append-only + hash-chain invariants enforced in-DB. |
| Testing | **Vitest**, **Playwright** | Prove the moat; drive the golden path in a real browser. |

## APIs

| API | Use | Key? | Fail-closed behaviour |
|---|---|---|---|
| **Open-Meteo ERA5 archive** | Rainfall/temperature baseline + anomaly Z-score | **No key** | Falls back to the real seeded 10-yr baseline |
| **Copernicus / Sentinel-2** | Field-level NDVI before/after | Yes (OAuth) | Seeded realistic NDVI |
| **Bhashini (MeitY)** STT/TTS/NMT | Voice claim in 22 Indian languages | Yes | Seeded Marwari/Hindi/English translations |
| **Supabase** | Durable persistence | Yes | In-memory deterministic seed store |

Every live integration sits behind a clean adapter (`src/adapters/*`) that fails
closed, so **the deployed demo needs zero secrets** and works on airplane mode.

## Service 3 — Dossier & Redressal

The sealed receipt becomes an **appeal-ready Loss Dossier** (`/dossier/[hash]`):
a light-themed, print-perfect, multilingual document (Marwari/Hindi/English) with
the QR verifier, the two independent evidence sources and the full auditable
corroboration reasoning — the farmer taps *Save as PDF* and files it with the
DGRC or insurance ombudsman. A machine-readable JSON export
(`/api/dossier/[hash]`, schema `sakshi.loss-dossier/v1`) lets an authority's
system ingest and independently re-verify the claim.

## Datasets

- **Open-Meteo ERA5 reanalysis** (2015–2025 daily) for five real Churu-district
  tehsils — the genuine source of every rainfall/temperature number in the seed
  fixtures. Reproducible via `scripts/fetch-weather.mjs`.
- **Real Churu-district field coordinates** (WGS84) for the five 2025 loss events.
- **Sentinel-2 NDVI** — realistic seeded before/after values per event, consistent
  with crop, growth stage and loss type (live adapter can replace them).
- **PMFBY operational parameters** — the 72-hour reporting window encoded in the
  timing signal.

## What is real vs seeded vs simulated

- **REAL:** all cryptography and geofencing; the corroboration maths; every
  weather number (Open-Meteo); field coordinates; the append-only DB invariants.
- **SEEDED:** the five 2025 loss events; Sentinel-2 NDVI values; Bhashini
  translations — all behind live adapters.
- **SIMULATED:** scale (five events stand in for ~4 crore PMFBY farmers/yr); the
  live-camera capture uses the device/seed GPS in the demo.

## Impact

~4 crore PMFBY farmers/yr, 86% smallholders <2 ha. SAKSHI flips disputes from
"farmer's word vs insurer's report" to **math + satellite + weather**. The same
pipeline extends to livestock, MGNREGA and disaster relief — any "prove-your-loss"
gap in Bharat. It doesn't detect fraud; it makes fraud **indefensible**.

## Original-code statement

All source in this repository was written during the AI for Bharat 2026 build
window. No pre-built product or no-code export is used. Commit history is clean
and in-window. Secrets are never committed (`.env.example` documents optional
keys only).
