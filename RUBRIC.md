# RUBRIC.md — where SAKSHI earns each point

AI for Bharat 2026 judging criteria → one line per criterion → exactly where it
is earned in the product and repo.

| Criterion | Weight | Where SAKSHI earns it |
|---|---|---|
| **Innovation & relevance to Bharat** | 25% | Inverts *who owns the proof* of crop loss — a farmer-owned tamper-evident receipt vs an insurer-gamed survey. Directly targets the PMFBY "marked zero" gap (1.7 lakh farmers, one state). Marwari-first for a low-literacy user. Landing `/` + `WRITEUP.md`. |
| **Technical implementation** | 25–30% | Two deterministic gravity components — append-only SHA-256 hash-chain with `verifyChain()` (`src/core/hashchain.ts`) + multi-signal corroboration engine with 10-yr Z-scores (`src/core/corroboration.ts`), geofencing (`geofence.ts`). **49 passing tests**; live in-browser tamper demo on `/ledger`; DB-level append-only + chain invariants in `supabase/schema.sql`. |
| **Feasibility & scalability** | 15–20% | Keyless, one-click Vercel deploy; every live API behind a fail-closed adapter; real Open-Meteo (free, no key); Supabase schema ready for the 7 tables. Same pipeline extends to any notified crop/district, livestock, MGNREGA, disaster relief. `HANDOFF.md`, `PROJECT.md`. |
| **UI/UX & presentation** | 15% | The SAKSHI UX Doctrine: hide the mechanism, dramatize the proof. Three-tap golden path, voice-first, multilingual, big touch targets, 60fps Moment, the "How was this verified?" progressive disclosure, the Screenshot-Moment receipt. `components/SealFlow.tsx`, `SealReceiptCard.tsx`, `HowVerified.tsx`. |
| **Impact & social good** | 15% | Makes fraud *indefensible* for ~4 crore PMFBY farmers (86% smallholders <2 ha); flips disputes to math+satellite+weather; dignity-first emotional design (reassurance, not gamification). `WRITEUP.md`, landing `/`. |

## The Gravity Core, made legible

- **Remove every LLM/API — is there still interesting CS?** Yes: the hash-chain
  and the corroboration engine are pure TypeScript, no network, no AI.
- **Proof it's real, not demo theater:**
  - `npm test` → 49 passing tests (tamper detection incl. the re-hash attack;
    the flagship computing to 94 from real data; drought via rainfall deficit).
  - `node scripts/fetch-weather.mjs` → reproduces the exact committed Open-Meteo
    numbers (data provenance).
  - `/ledger` → click **Forge receipt #1** → live `PAYLOAD_TAMPERED` /
    `BROKEN_LINK`.
  - `/health` → `chain.valid: true, keylessDemo: true`.

## Required deliverables checklist

- [x] **Working hosted demo** — keyless, one-click Vercel (`HANDOFF.md`).
- [x] **Public GitHub repo, original source** — clean in-window history.
- [x] **Short write-up (tools/APIs/datasets)** — `WRITEUP.md`.
- [x] **2-minute explainer video kit** — `VIDEO.md` (script + shot list).
- [x] **Demo script** — `DEMO_SCRIPT.md`.
- [x] **This rubric coverage map** — `RUBRIC.md`.
