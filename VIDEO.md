# VIDEO.md — SAKSHI 2-minute explainer kit

Everything needed to screen-record and narrate the required 2-minute video.
Word-for-word voiceover, shot list, on-screen text, and the cited 15-second hook.
Total runtime ~1:55. Record the screen on the **live keyless URL** at a phone
viewport (or use a phone). Background music: low, warm, no percussion carnival.

---

## HOOK — 0:00–0:15 (the gut-punch)

**VOICEOVER:**
> "One-point-seven lakh farmers. One state. One year. Their genuine crop-loss
> claims were marked **ZERO** — forged reports, no field survey, and they were
> never even told. The people paid to verify the loss are paid to minimise it."

**ON-SCREEN TEXT:**
- `1.7 lakh claims marked "ZERO"` → `₹122-crore PMFBY scam, Rajasthan 2023–24`
- small citation: `Source: Rediff/PTI, Dainik Bhaskar, 2025`

**SHOTS:** Open on the SAKSHI landing page; slow zoom on the struck-through
**ZERO** headline. Cut to the live stat bar.

---

## PROBLEM → SHIFT — 0:15–0:35

**VOICEOVER:**
> "Under PMFBY, the same farmer who must report damage within 72 hours depends on
> an insurer-controlled survey that can be forged, skipped, or ignored. SAKSHI —
> साक्षी, 'witness' — flips it. Stop asking the insurer to prove the loss. Let the
> farmer **seal** it, the instant it happens."

**ON-SCREEN TEXT:** `Don't prove the loss to the payer. Seal it — corroborated by
two sources no one can bribe.`

**SHOTS:** The tagline under the logo; the three-tap hint "Capture · Speak ·
Sealed".

---

## THE MOMENT — 0:35–1:05 (the centrepiece — let it breathe)

**VOICEOVER:**
> "Sunita points her phone at her field — GPS confirms she's standing inside her
> registered plot. She speaks, in Marwari: *'my bajra has drowned.'* She taps
> once."
>
> *(pause for the animation)*
>
> "Her field's satellite view collapses from green to brown. Rainfall: **plus
> seven hundred percent** over the ten-year normal. And it seals — **corroboration
> ninety-four out of a hundred** — with a cryptographic hash chained to the receipt
> before it."

**ON-SCREEN TEXT (timed to the animation):**
- `📍 inside registered field`
- `"म्हारी बाजरी पाणी में डूब गी"` (subtitle: *my bajra has drowned*)
- `green → brown` · `+720% rainfall` · `✓ SEALED · 94/100`

**SHOTS:** Record the real `/seal` flow end to end: capture → located pin → mic +
waveform → **Seal** → green→brown morph + stamp + thunk → the 94 dial. Do not cut
during the morph.

---

## THE PROOF & THE MOAT — 1:05–1:40

**VOICEOVER:**
> "To the farmer it's just 'you're protected now.' But tap **'How was this
> verified?'** and the real evidence opens: Sentinel-2 satellite showing the NDVI
> drop, Open-Meteo weather — **real ERA5 data** — five-point-nine sigma above the
> ten-year baseline, and the hash chain itself. Two independent sources, plus
> cryptography. Try to forge a sealed receipt and the math catches it instantly —
> even if you re-hash it, the next link breaks."

**ON-SCREEN TEXT:**
- `Sentinel-2 NDVI 0.62 → 0.14` · `Open-Meteo +5.9σ vs 10-yr baseline`
- `hash chained · append-only`
- `CHAIN INTACT ✓ → TAMPER DETECTED ✗`

**SHOTS:** Expand "How was this verified?" on `/receipt`. Then `/ledger` → click
**Forge receipt #1** → the INTACT→DETECTED flip. Optional 1-sec cut to a terminal
showing `npm test → 49 passed`.

---

## CLOSE — 1:40–1:55

**VOICEOVER:**
> "SAKSHI doesn't detect fraud. It makes fraud **indefensible** — a tamper-proof,
> independently-corroborated receipt the payer can't erase. Built for four crore
> farmers. Sealed in ten seconds, in her own language, before anyone can mark it
> zero."

**ON-SCREEN TEXT:** `SAKSHI · साक्षी` · `the unerasable witness` · `<live URL>` ·
`github.com/Shreekumar-Shah-AICTE/SAKSHI`

**SHOTS:** Return to the glowing SEALED receipt; fade to the logo lockup + URL.

---

## Production notes

- **Length target:** keep under 2:00. If tight, trim the PROBLEM→SHIFT section.
- **Captions:** burn in English subtitles for the Marwari line.
- **Tone:** reassurance and dignity, not hype. Warm, steady VO.
- **Screen capture:** phone viewport (430×932) or a real phone for authenticity.
- **Do NOT** show any API keys, `.env`, or terminal secrets on screen.
- **Citations to keep on-screen briefly:** PMFBY scam figures — Rediff/PTI & Dainik
  Bhaskar 2025; ₹947.72 cr pending — DownToEarth/IASGyan 2025; 72-hour window —
  PMFBY Operational Guidelines.
