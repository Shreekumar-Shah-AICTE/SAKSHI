import { getEvent, type SeedNarration } from "@/data/seed/churu-events";
import { LANGUAGES, type LangCode, UI_STRINGS } from "@/lib/strings";

/**
 * SAKSHI — Bhashini adapter (STT / TTS / translate for 22 Indian languages).
 *
 * Bhashini (MeitY DPI) is the access layer that lets any Bharat farmer file a
 * claim by voice. Live calls need a Bhashini pipeline auth token, so they are
 * progressive enhancement. With no BHASHINI_* keys, this adapter FAILS CLOSED
 * to the seeded translations captured with each event — so the multilingual
 * Loss Receipt and the voice-first flow work on the keyless golden path.
 */

export { LANGUAGES, UI_STRINGS };
export type { LangCode };

function bhashiniConfigured(): boolean {
  return Boolean(
    process.env.BHASHINI_USER_ID &&
      process.env.BHASHINI_API_KEY &&
      process.env.BHASHINI_INFERENCE_API_KEY,
  );
}

export interface NarrationResult {
  eventId: string;
  /** The chosen language's narration. */
  primary: SeedNarration;
  /** All available translations for the multilingual receipt. */
  all: SeedNarration[];
  live: boolean;
}

/**
 * Resolve the narration (transcript + translations) for an event's spoken
 * claim. Seeded by default; the live branch would call Bhashini ASR + NMT.
 */
export async function resolveNarration(
  eventId: string,
  lang: LangCode = "mwr",
): Promise<NarrationResult> {
  const event = getEvent(eventId);
  if (!event) throw new Error(`Unknown event ${eventId}`);
  const all = event.narration;
  const primary = all.find((n) => n.lang === lang) ?? all[0];

  if (bhashiniConfigured()) {
    try {
      // A real implementation would POST audio to the Bhashini ASR pipeline,
      // then NMT to the other languages. Not wired without credentials.
      throw new Error("Bhashini live pipeline not wired in this build");
    } catch {
      return { eventId, primary, all, live: false };
    }
  }
  return { eventId, primary, all, live: false };
}
