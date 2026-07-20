# HANDOFF.md — the operator runbook

One ordered, copy-pasteable checklist. Each item is tagged. **The app is fully
functional with none of the OPTIONAL steps** — the golden path needs zero
secrets.

---

## `REQUIRED` — 0 · Make `main` the default branch (~30 sec, one-time)

The complete, clean history lives on **both `main` and a `claude/…` build
branch** (identical commits). GitHub auto-set the build branch as default
because it was pushed first to the empty repo, and it won't let an automated
token flip that pointer. Fix it in two clicks:

1. Repo → **Settings → General → Default branch** → switch to **`main`** →
   **Update**.
2. Repo → **Branches** → delete the `claude/sakshi-build-…` branch.

(Everything below works regardless, but this makes `main` the branch judges land
on and the branch Vercel deploys by default.)

---

## `REQUIRED` — 1 · Deploy to Vercel (~10 min)

1. Go to <https://vercel.com/new> and sign in with GitHub.
2. **Import** `Shreekumar-Shah-AICTE/SAKSHI`.
3. Framework preset: **Next.js** (auto-detected). Build command `next build`,
   install `npm install` — both default. **Do not add any environment variables.**
4. Click **Deploy**. Wait for the build to finish (~2 min).
5. Open the assigned URL. You now have the **sacred URL** — put it in the README,
   the submission form, and the video end-card.

> The deployed app runs entirely on the deterministic seed data + real Open-Meteo
> (no key). It is the full, unforgettable demo with zero configuration.

## `REQUIRED` — 2 · Real-browser smoke test on the LIVE URL (~3 min)

Do this *before* submitting. Exact clicks:

1. Open `‹live-url›/health` → confirm `{"status":"ok", "chain":{"valid":true}, "keylessDemo":true}`.
2. Open the home page → click **▶ Seal Sunita's claim**.
3. Click **📷 Photograph the field** → wait for the **📍 Field located ✓** pin.
4. Click the **→** button → tap the **🎙️ mic** → the Marwari line appears.
5. Click **🔒 Seal this loss** → watch green→brown + **+720% rainfall** + the
   **✓ SEALED · 94/100** dial.
6. Click **View full receipt** → click **How was this verified?** → confirm the
   satellite, weather (+5.9σ) and hash sections open.
7. Scan the QR (or open `‹live-url›/verify/‹hash›`) → confirm **VERIFIED ✓**.
8. Go to `/ledger` → click **⚒️ Forge receipt #1** → confirm **TAMPER DETECTED**.

If all eight pass, the demo is submission-ready.

## `REQUIRED` — 3 · Record the 2-minute video (~30 min)

Follow `VIDEO.md` word-for-word (voiceover + shot list + on-screen text). Record
the screen on the live URL at a phone viewport. Keep it under 2:00. Burn in
English subtitles for the Marwari line. Show no secrets on screen.

## `OPTIONAL` — 4 · Supabase persistence (~10 min)

Only needed for durable, multi-user persistence — the demo does **not** require it.

1. Create a project at <https://supabase.com>.
2. In the SQL editor, paste and run **`supabase/schema.sql`** (creates the 7
   tables + append-only + hash-chain triggers + RLS).
3. In Vercel → Project → **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service-role key *(server-side only — never expose)*
4. Redeploy.

## `OPTIONAL` — 5 · Bhashini live voice (~15 min)

Seeded Marwari/Hindi/English narration plays without any key. For *live* ASR/NMT:

1. Get credentials from <https://bhashini.gov.in> (ULCA / Pipeline auth).
2. Add server-side env vars in Vercel: `BHASHINI_USER_ID`, `BHASHINI_API_KEY`,
   `BHASHINI_INFERENCE_API_KEY`.
3. Redeploy. The `bhashini` adapter uses them and still fails closed to seed.

## `OPTIONAL` — 6 · Copernicus / Sentinel-2 live NDVI

Add `COPERNICUS_CLIENT_ID` + `COPERNICUS_CLIENT_SECRET` (server-side). Without
them the app uses the seeded NDVI values. (The live sampling call is stubbed to
fail closed in this build.)

## `ROADMAP` — 7 · WhatsApp Cloud API delivery

Descoped for the Build Round. Next step: deliver the Loss Receipt PDF + QR via
the WhatsApp Cloud API so farmers receive it where they already hoard evidence.

---

## Environment variable manifest

| Var | Required? | Scope | Purpose |
|---|---|---|---|
| _(none)_ | — | — | **Keyless demo works with zero vars.** |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | public | Supabase persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | public | Supabase read (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | **server** | Supabase writes |
| `BHASHINI_USER_ID` / `BHASHINI_API_KEY` / `BHASHINI_INFERENCE_API_KEY` | Optional | **server** | Live voice |
| `COPERNICUS_CLIENT_ID` / `COPERNICUS_CLIENT_SECRET` | Optional | **server** | Live NDVI |
| `NEXT_PUBLIC_APP_URL` | Optional | public | Override QR base URL |

## Health & liveness

- `GET /health` → `200` with `status: ok`, `chain.valid: true`, `keylessDemo: true`.
- `npm test` → 49 passing tests.
- `node scripts/fetch-weather.mjs` → reproduces the seeded weather numbers.
