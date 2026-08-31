import { ChatMessage } from '../../models';

/**
 * Pure derivations lifted out of TriageShellComponent.
 *
 * These were private methods that read no component state beyond their
 * arguments. Extracting them changes no behaviour — the component keeps thin
 * delegating wrappers — but it makes the spam guard and the age maths testable
 * without instantiating a 1400-line component, which is the point.
 *
 * Bodies are copied verbatim from v1; only `this.` parameters became explicit.
 */

/**
 * Keyboard-mash heuristic. Only fires on longer tokens so short Hinglish words
 * (nahi, bhai, kyun) are never flagged.
 */
export function looksGibberish(token: string): boolean {
  const w = token.replace(/[^a-z]/gi, '').toLowerCase();
  if (w.length < 6) return false; // too short to judge — let it through
  if (/(.)\1{3,}/.test(w)) return true; // 4+ of the same char: aaaaa, hhhh
  if (/^(asdf|qwer|zxcv|hjkl|jkl)/.test(w)) return true; // home-row runs
  const vowels = (w.match(/[aeiou]/g) || []).length;
  return vowels / w.length < 0.15; // almost no vowels: consonant mash
}

/**
 * Cheap, conservative "is this obvious junk?" check. Catches exact repeats of a
 * recent user message and keyboard-mash gibberish — NOT short valid answers
 * like "no"/"nahi" (those are real triage answers). Anything semantic is left
 * to the backend classifier.
 *
 * @param history the full message list; only recent USER turns are considered
 */
export function isLowSignal(text: string, history: ChatMessage[]): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 2) return true;
  // Exact repeat of a recent user turn (e.g. pasting the same line again).
  // Length-gated: short identical answers like "no"/"yes"/"nahi"/"4" are
  // legitimate replies to DIFFERENT triage questions, not re-pasted junk —
  // only flag substantial repeats so a denial streak never blocks the report.
  const repeated =
    t.length >= 12 &&
    history
      .filter((m) => m.role === 'user')
      .slice(-5, -1)
      .some((m) => m.text.trim().toLowerCase() === t);
  if (repeated) return true;
  // Every token is gibberish -> treat as junk. A single real word saves it.
  return t.split(/\s+/).every((w) => looksGibberish(w));
}

/** Whole years between a date of birth and today, or null if implausible. */
export function ageFromDob(v: unknown): number | null {
  if (!v) return null;
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 150 ? a : null;
}
