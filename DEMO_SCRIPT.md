# DEMO_SCRIPT.md — SAKSHI live demo (3 acts, ~2.5 min)

**Goal: make the room go quiet for ten seconds.** Built around the Moment.
Everything below runs on the **keyless** live URL — no logins, no API keys, works
on airplane mode. Rehearse the exact clicks; there is one obvious action per step.

> Before you start: open the **live URL**, full-screen the browser, and set the
> language toggle to **मारवाड़ी (Marwari)**. Have `/ledger` open in a second tab.

---

## ACT 1 — The wound (0:00–0:30) · page: `/`

**Say:** *"In Churu, Rajasthan, Sunita Devi lost her bajra to a freak flood. She
photographed it, she called the helpline, she waited. Months later the insurer's
report said her loss was… zero. No surveyor ever came. She is one of 1.7 lakh
farmers zeroed out in a single scam, in one state."*

**Do:** Land on the home page. Point at the struck-through **"ZERO"** headline and
the live ledger stat bar — *"5 receipts, chain intact, 5 farmers protected."*

**Say:** *"The open secret: the person who verifies the loss is paid to minimise
it. So SAKSHI stops asking the insurer to prove the loss. It lets the farmer
**seal** it."*

**Click:** **▶ Seal Sunita's claim.**

---

## ACT 2 — The Moment (0:30–1:15) · page: `/seal`

> This is the ten seconds. Slow down. Let it breathe.

1. **Say:** *"Three taps. Capture, speak, sealed."*
2. **Click** **📷 Photograph the field.** → a **📍 Field located ✓** pin drops with
   the GPS inside the registered polygon. **Say:** *"GPS, timestamp — and it's
   inside her registered field. No borrowed disaster photos."*
3. **Click** the arrow to continue → **tap the 🎙️ mic.** The waveform animates;
   her Marwari sentence appears: **"म्हारी बाजरी पाणी में डूब गी"** — *my bajra has
   drowned.* **Say:** *"In her language. Bhashini gives us 22."*
4. **Click** **🔒 Seal this loss.** → **WATCH:** the satellite field morphs
   **green → brown**, a **+720% rainfall** stamp slams down, the hash ticks out,
   and the vault **thunks** into a glowing **✓ SEALED**.
5. The dial counts to **94/100 · strongly corroborated**. Under it, in Marwari:
   *"थारो नुकसान अब कोई मिटा नीं सकै"* — **no one can erase your loss now.**

**Say (quietly):** *"This claim can never be marked zero again."*

---

## ACT 3 — The proof + the moat (1:15–2:15)

**Click** **View full receipt →** (`/receipt/[hash]`). This is the Screenshot
Moment — pause here so judges can photograph it.

**Say:** *"That's what the farmer sees — simple, dignified. But watch what a judge,
an ombudsman, a court can see."*

> **Optional (Service 3 — Redressal):** tap **📄 Appeal-ready dossier** to open
> `/dossier/[hash]` — a clean, multilingual, QR-verifiable document the farmer can
> Save-as-PDF and file with the DGRC, or **⬇️ Export JSON** for a machine-readable
> version an ombudsman's system can ingest. *"The loss doesn't just get sealed — it
> becomes an appeal packet."*

**Click** **"How was this verified?"** — it expands into the real evidence:

- **Independent source 1 — Sentinel-2:** the field's NDVI **0.62 → 0.14, −77%**.
- **Independent source 2 — Open-Meteo:** **58mm vs a 7mm 10-year baseline, +5.9σ**
  — *"real ERA5 data; here's the provenance script in the repo."*
- **The seal:** media hash → payload hash → receipt hash **chained to #3**.
- The **machine-readable reasons** the score is built from.

**Say:** *"Two sources no one can bribe, plus a cryptographic chain. That's the
moat — verification and integration. And it's not a slide; it's tested."*

**Switch tab → `/ledger`.** **Say:** *"Here's the append-only chain of every
sealed loss. Let me try to forge one."*

**Click** **⚒️ Forge receipt #1.** → the panel flips **CHAIN INTACT ✓ → TAMPER
DETECTED ✗ (`PAYLOAD_TAMPERED`)**. **Tick "also re-hash it"** and forge again →
**`BROKEN_LINK`**. **Say:** *"Even a sophisticated forger who re-hashes the receipt
still breaks the next link. The math catches it every time — the live ledger was
never touched."*

**Close:** *"SAKSHI doesn't detect fraud. It makes fraud indefensible — by giving
the farmer a tamper-proof, independently-corroborated receipt the payer cannot
erase. Sealed in ten seconds, in her own language, before anyone can mark it
zero."*

---

## If asked to prove it's real (30-sec appendix)

- Terminal: `node scripts/fetch-weather.mjs` → the live Open-Meteo numbers match
  the receipt exactly.
- Terminal: `npm test` → **49 passing** Gravity Core tests.
- `/health` → `{ status: "ok", chain.valid: true, keylessDemo: true }`.

## Failure playbook

- **Live URL down / no network:** the app is a PWA and the core is deterministic
  — reopen the cached tab; it runs offline. Worst case, run `npm run dev` locally
  (no keys needed) and use the same clicks.
- **Animation stutters on the projector:** the Moment respects
  `prefers-reduced-motion`; the SEALED state and score still land instantly.
- **A click misses:** every page is deep-linkable — go straight to
  `/receipt/<hash>` from `/ledger`.
