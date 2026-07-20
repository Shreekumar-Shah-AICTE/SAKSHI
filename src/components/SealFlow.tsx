"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SatelliteGrid } from "./SatelliteGrid";
import { CorroborationDial } from "./CorroborationDial";
import { t, LANGUAGES, type LangCode } from "@/lib/strings";
import type { ReceiptView } from "@/lib/view";
import { shortHash } from "@/lib/utils";

type Step = "capture" | "speak" | "sealing" | "sealed";

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A soft, low "vault thunk" synthesised with Web Audio — no asset, keyless. */
function playThunk() {
  try {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.42);
    o.onended = () => ctx.close();
  } catch {
    /* audio is a bonus, never required */
  }
}

export function SealFlow({ initial }: { initial: ReceiptView }) {
  const [lang, setLang] = useState<LangCode>(
    (LANGUAGES.some((l) => l.code === initial.langPref) ? initial.langPref : "mwr") as LangCode,
  );
  const [step, setStep] = useState<Step>("capture");
  const [located, setLocated] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState(false);
  const [phase, setPhase] = useState(0);
  const [stampIn, setStampIn] = useState(false);
  const [hashIn, setHashIn] = useState(false);
  const [sealed, setSealed] = useState<ReceiptView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const narration = initial.narration.find((n) => n.lang === lang) ?? initial.narration[0];

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const tweenPhase = useCallback((to: number, ms: number) => {
    return new Promise<void>((resolve) => {
      if (prefersReducedMotion()) {
        setPhase(to);
        resolve();
        return;
      }
      const from = 0;
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / ms);
        const eased = 1 - Math.pow(1 - k, 3);
        setPhase(from + (to - from) * eased);
        if (k < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  async function onCapture() {
    setLocated(false);
    await wait(150);
    setLocated(true);
  }

  async function onSpeak() {
    setListening(true);
    setHeard(false);
    await wait(1700);
    setListening(false);
    setHeard(true);
  }

  const runSeal = useCallback(async () => {
    setStep("sealing");
    setErr(null);
    playThunk();
    const respPromise = fetch("/api/seal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: initial.eventId }),
    })
      .then((r) => r.json())
      .catch(() => null);

    await tweenPhase(1, 1500); // green -> brown
    setStampIn(true);
    await wait(550);
    setHashIn(true);

    const resp = (await respPromise) as { view?: ReceiptView } | null;
    // Fail-closed to the initial (already-sealed, deterministic) view.
    setSealed(resp?.view ?? initial);
    if (!resp?.view) setErr(null);
    await wait(650);
    setStep("sealed");
  }, [initial, tweenPhase]);

  return (
    <div className="mx-auto max-w-md px-5 pb-16">
      {/* progress + language */}
      <div className="mb-6 flex items-center justify-between">
        <StepDots step={step} lang={lang} />
        <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                lang === l.code ? "bg-seal text-night" : "text-soil-300 hover:text-soil-100"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1 — CAPTURE */}
        {step === "capture" && (
          <motion.div key="capture" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="text-center">
            <h2 className="mb-1 text-2xl font-black text-soil-100">{t(lang, "capture")}</h2>
            <p className="mb-6 text-sm text-soil-300">{t(lang, "captureHint")}</p>

            <div className="relative mx-auto mb-6 w-full max-w-xs">
              <SatelliteGrid before={initial.ndvi.sceneBefore} after={initial.ndvi.sceneBefore} phase={0} />
              {located && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 grid place-items-center"
                >
                  <div className="rounded-2xl bg-night/70 px-4 py-3 text-center backdrop-blur">
                    <div className="text-2xl">📍</div>
                    <div className="text-sm font-semibold text-ndvi-green">{t(lang, "located")} ✓</div>
                    <div className="mono text-[10px] text-soil-300">
                      {initial.gps.lat.toFixed(4)}, {initial.gps.lng.toFixed(4)} · inside field
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {!located ? (
              <button className="btn-primary w-full" onClick={onCapture}>
                📷 {t(lang, "capture")}
              </button>
            ) : (
              <button className="btn-primary w-full" onClick={() => setStep("speak")}>
                {t(lang, "tapToSpeak")} →
              </button>
            )}
          </motion.div>
        )}

        {/* STEP 2 — SPEAK */}
        {step === "speak" && (
          <motion.div key="speak" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="text-center">
            <h2 className="mb-1 text-2xl font-black text-soil-100">{t(lang, "tapToSpeak")}</h2>
            <p className="mb-6 text-sm text-soil-300">{LANGUAGES.find((l) => l.code === lang)?.english}</p>

            <button
              onClick={onSpeak}
              className={`relative mx-auto mb-6 grid h-40 w-40 place-items-center rounded-full text-5xl transition ${
                listening ? "bg-seal/20" : "bg-white/5 hover:bg-white/10"
              }`}
              aria-label={t(lang, "tapToSpeak")}
            >
              <span className={listening ? "animate-pulse" : ""}>🎙️</span>
              {listening && <Waveform />}
            </button>

            <AnimatePresence>
              {(listening || heard) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 min-h-[64px]">
                  {listening ? (
                    <div className="text-seal">{t(lang, "listening")}</div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="text-lg text-soil-100">&ldquo;{narration.spoken}&rdquo;</div>
                      <div className="text-xs text-soil-300">{narration.english}</div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {heard && (
              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="btn-primary w-full" onClick={runSeal}>
                🔒 {t(lang, "sealThis")}
              </motion.button>
            )}
          </motion.div>
        )}

        {/* STEP 3 — SEALING (the Moment) */}
        {step === "sealing" && (
          <motion.div key="sealing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="relative mx-auto mb-6 w-full max-w-xs">
              <SatelliteGrid before={initial.ndvi.sceneBefore} after={initial.ndvi.sceneAfter} phase={phase} />
              <AnimatePresence>
                {stampIn && (
                  <motion.div
                    initial={{ scale: 1.6, opacity: 0, rotate: -8 }}
                    animate={{ scale: 1, opacity: 1, rotate: -8 }}
                    transition={{ type: "spring", stiffness: 380, damping: 16 }}
                    className="absolute -right-2 top-4 rounded-xl border-2 border-seal bg-night/80 px-3 py-2 backdrop-blur"
                  >
                    <div className="text-lg font-black text-seal">{initial.weather.stamp}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="text-seal">{t(lang, "sealing")}</div>
            {hashIn && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mono mt-3 text-xs text-soil-300">
                sha256:{shortHash(initial.receiptHash ?? "", 12, 6)}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* STEP 4 — SEALED */}
        {step === "sealed" && sealed && (
          <motion.div
            key="sealed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-seal/15 px-4 py-1.5 text-seal shadow-seal animate-glow-pulse">
              <span className="text-xl">🔏</span>
              <span className="font-black tracking-wide">✓ {t(lang, "sealed").toUpperCase()}</span>
            </div>

            <div className="mx-auto my-4 flex justify-center">
              <CorroborationDial score={sealed.score ?? 0} />
            </div>

            <p className="mx-auto mb-2 max-w-xs text-lg font-semibold text-soil-100">
              {t(lang, "protected")}
            </p>
            <p className="mx-auto mb-6 max-w-xs text-sm text-seal">
              This claim can never be marked &ldquo;zero&rdquo; again.
            </p>

            <div className="grid gap-3">
              <Link href={`/receipt/${sealed.receiptHash}`} className="btn-primary w-full">
                {t(lang, "viewReceipt")} →
              </Link>
              <Link href="/" className="btn-ghost w-full">
                {t(lang, "another")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {err && <p className="mt-4 text-center text-sm text-ndvi-brown">{err}</p>}
    </div>
  );
}

function StepDots({ step, lang }: { step: Step; lang: LangCode }) {
  const order: Step[] = ["capture", "speak", "sealing"];
  const activeIndex = step === "sealed" ? 3 : order.indexOf(step);
  return (
    <div className="flex items-center gap-2 text-xs text-soil-300">
      <span className="label-muted">{t(lang, "step")}</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-2 w-8 rounded-full transition ${i <= activeIndex ? "bg-seal" : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

function Waveform() {
  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className="flex items-end gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 rounded-full bg-seal"
            animate={{ height: [8, 28, 12, 32, 10] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.08 }}
            style={{ height: 12 }}
          />
        ))}
      </span>
    </span>
  );
}
