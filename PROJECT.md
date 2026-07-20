# PROJECT.md — SAKSHI · साक्षी

**The single source of truth for this build.** SAKSHI is the tamper-proof
witness to a farmer's crop loss — sealed in 10 seconds, in their own language,
corroborated by two sources no one can bribe (satellite + weather), before an
insurer can mark it "zero".

- **Live demo:** _(operator adds the Vercel URL after deploy — see `HANDOFF.md`)_
- **Repo:** https://github.com/Shreekumar-Shah-AICTE/SAKSHI
- **Hackathon:** AI for Bharat 2026 · Build Round
- **Tracks:** PRIMARY AgriTech · SECONDARY Financial Inclusion · ACCESS LAYER Regional-Language AI

---

## 1 · The idea (LOCKED — do not re-scope)

Stop asking the insurer to *prove* the loss. Let the farmer *seal* it — the
instant it happens, in their own voice, corroborated by free satellite + weather
data. The insurer's discretionary field visit (the step that gets gamed) becomes
obsolete as the source of truth.

## 2 · The moat = VERIFICATION + INTEGRATION

Two deterministic, non-AI "gravity" components. **Litmus test: remove every LLM
and API — is there still interesting computer science? Yes.** Both are pure,
framework-free TypeScript with an exhaustive test suite (49 tests).

1. **Tamper-evident evidence pipeline** (`src/core/hashchain.ts`, `geofence.ts`)
   EXIF/GPS → point-in-polygon geofence against the registered field → canonical
   SHA-256 → append-only hash-chain (each receipt embeds the previous hash) →
   deterministic `verifyChain()` that makes tampering mathematically detectable.

2. **Multi-signal corroboration engine** (`src/core/corroboration.ts`)
   Sentinel-2 NDVI drop (thresholds by growth stage) + weather Z-score vs a
   10-year baseline (rainfall for floods, temperature for heat, deficit for
   drought) + PMFBY 72-hour window + a cross-signal integration term →
   a **0–100 score with machine-readable reasons.**

The flagship Churu flood computes to **94/100** — a number produced by the engine
from **real 2025 Open-Meteo data (+720% rainfall, Z=5.9)**, never hard-coded.

## 3 · The Real Architecture Rule

**architecture REAL · data SEEDED · scale SIMULATED.** Inputs are seeded;
computation is never faked. The five seeded Churu 2025 events carry **real field
coordinates and real Open-Meteo ERA5 weather** (see `scripts/fetch-weather.mjs`,
which reproduces the exact committed numbers). Sentinel-2 NDVI values are
realistic seeds behind a live adapter.

## 4 · Keylessness on the golden path (critical)

**The demo a judge sees depends on ZERO secrets.** The deterministic core needs
no live API. Live integrations are progressive enhancement behind clean adapters
that **fail closed** to seeded data:

| Adapter | Live path | Fail-closed default |
|---|---|---|
| `adapters/weather.ts` | Open-Meteo archive (no key) | seeded 10-yr baseline |
| `adapters/sentinel.ts` | Copernicus (key-gated) | seeded NDVI |
| `adapters/bhashini.ts` | Bhashini STT/TTS/NMT (key-gated) | seeded translations |
| `data/store.ts` | Supabase (`supabase/schema.sql`) | in-memory seed store |

`/health` confirms the keyless demo booted and the chain verifies.

## 5 · The UX law — HIDE THE MECHANISM, DRAMATIZE THE PROOF

The farmer never sees NDVI thresholds, Z-scores, growth-stage math or hash
internals. But the **proof** (SEALED state, the score, satellite green→brown, the
rainfall stamp, the chained hash) is shown loud and proud, because it IS the
moat. The single "How was this verified?" tap (`components/HowVerified.tsx`)
expands the real evidence for a judge/ombudsman while the farmer ignores it.

## 6 · The Moment

Farmer speaks one Marwari sentence → the field's satellite chart flashes
green→brown → a **+720% rainfall** stamp lands → a glowing **✓ SEALED ·
Corroboration 94/100** receipt appears with a cryptographic hash chained to the
previous one. *"This claim can never be marked zero again."*
Choreographed in `components/SealFlow.tsx` (three-tap golden path, 60fps,
`prefers-reduced-motion` aware, synthesised vault "thunk").

## 7 · Stack

Next.js 14 (App Router) + TypeScript · Tailwind · Framer Motion · `node:crypto`
· `exifr` · `qrcode`. Deploy: Vercel + (optional) Supabase. All original code,
written in this build window.

## 8 · Seven tables

`farmers · fields (geo-polygons) · loss_events · evidence_receipts (hash-chain)
· corroboration_reports · claim_dossiers · audit_log` — see
`supabase/schema.sql`, which enforces the append-only + hash-chain invariants at
the database layer (not just in app code).

## 9 · Tier, clock budget & Sacred Block

- **Tier:** 48h STANDARD. **Cut scope, not stages.**
- **Sacred Block:** the final ~10h reserved for Hardening → Pitch → Submission,
  never borrowed against.
- **Checkpoints:** walking skeleton by 25%; Gravity Core real + demoable by 50%;
  golden path hardened by 75%; Sacred Block for artifacts + submission.

## 10 · Decisions log (undecidable → most defensible option)

- **Real Next.js/TS, not Lovable/n8n.** The PDF's no-code mention is superseded
  by the Build-Round rule that code be original. Architecture + APIs preserved.
- **WhatsApp descoped to ROADMAP.** Primary delivery = in-app multilingual Loss
  Receipt + QR verifier. WhatsApp Cloud API is a documented next step.
- **Owner writes go to `main` via the GitHub MCP** (the local sandbox git is
  restricted to `claude/*` branches). Clean, curated commit history.
- **No real drought event seeded.** The 2025 Churu monsoon was genuinely wet, so
  seeding a drought would be fabricated data. The five events are all real
  wet/heat anomalies; the engine's drought path is covered by unit tests instead.
- **Deterministic seal timestamps** (`event.reportedAt`) so the seeded chain and
  every QR link stay identical across serverless cold starts and redeploys.
- **Satellite imagery is a deterministic NDVI grid**, not fetched tiles — keyless,
  identical on every device, and enough to land the green→brown Moment.

## 11 · Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| No API keys at demo time | High | Keyless golden path; every adapter fails closed to seed. |
| Live network flaky on projector | Med | Deterministic core; PWA shell cached by `sw.js`; airplane-mode safe. |
| `npm audit` flags on Next self-hosting/dev tooling | Med | On latest patched 14.2.35; residual advisories are self-host/dev-only, N/A on Vercel. Documented. |
| Serverless cold start resets in-memory store | Med | Seeding is deterministic → every instance is byte-identical; QR links stable. |
| Judge probes the moat | Desired | 49 tests + live in-browser tamper demo on `/ledger`. |

## 12 · Definition of Done

✅ Deployed, keyless-demo-capable · both Gravity Core components real + tested
(49 tests) · the 10-second Moment lands · UI passes the SAKSHI UX Doctrine ·
golden path verified in a real browser (`npm run verify`) · six artifacts written,
committed and delivered in chat · rubric map complete · secrets clean · repo
public with original in-window history.
