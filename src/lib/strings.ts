/** Client-safe multilingual UI strings + language list (no server imports). */

export const LANGUAGES = [
  { code: "mwr", label: "मारवाड़ी", english: "Marwari" },
  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "en", label: "English", english: "English" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const UI_STRINGS: Record<LangCode, Record<string, string>> = {
  mwr: {
    capture: "खेत रो फोटू लो",
    captureHint: "फोन नै खेत कानी करो",
    located: "खेत मिल ग्यो",
    tapToSpeak: "बोलण खातर दबावो",
    listening: "सुण रह्या हां…",
    heard: "आ सुण्यो",
    sealThis: "आ नुकसान सील करो",
    sealing: "सील कर रह्या हां…",
    sealed: "सील हो ग्यो",
    protected: "थारो नुकसान अब कोई मिटा नीं सकै",
    viewReceipt: "पूरी रसीद देखो",
    another: "दूजो नुकसान सील करो",
    step: "पग",
  },
  hi: {
    capture: "खेत की फोटो लें",
    captureHint: "फ़ोन को खेत की ओर करें",
    located: "खेत मिल गया",
    tapToSpeak: "बोलने के लिए दबाएँ",
    listening: "सुन रहे हैं…",
    heard: "यह सुना",
    sealThis: "यह नुकसान सील करें",
    sealing: "सील किया जा रहा है…",
    sealed: "सील हो गया",
    protected: "आपका नुकसान अब कोई मिटा नहीं सकता",
    viewReceipt: "पूरी रसीद देखें",
    another: "दूसरा नुकसान सील करें",
    step: "चरण",
  },
  en: {
    capture: "Photograph the field",
    captureHint: "Point the phone at the field",
    located: "Field located",
    tapToSpeak: "Press to speak",
    listening: "Listening…",
    heard: "Heard you",
    sealThis: "Seal this loss",
    sealing: "Sealing…",
    sealed: "Sealed",
    protected: "No one can erase your loss now",
    viewReceipt: "View full receipt",
    another: "Seal another loss",
    step: "Step",
  },
};

export function t(lang: LangCode, key: string): string {
  return UI_STRINGS[lang]?.[key] ?? UI_STRINGS.en[key] ?? key;
}
