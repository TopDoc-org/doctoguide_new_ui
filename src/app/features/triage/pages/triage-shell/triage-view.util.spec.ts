import { ChatMessage } from '../../models';
import { ageFromDob, isLowSignal, looksGibberish } from './triage-view.util';

/**
 * The spam guard decides whether a user's message reaches the backend at all.
 * A false positive silently refuses to help someone describing a real symptom —
 * and the users most at risk are the ones typing Hinglish or Devanagari, which
 * is exactly what a naive "looks like junk" heuristic gets wrong.
 *
 * These fixtures are the contract. v1 had no tests here at all.
 */
describe('triage spam guard', () => {
  const user = (text: string): ChatMessage => ({ role: 'user', text }) as ChatMessage;

  describe('looksGibberish', () => {
    it('lets short tokens through untouched — too short to judge', () => {
      for (const w of ['no', 'yes', 'nahi', 'hai', 'bhai', 'kyun', 'ok', 'haan', '3', 'kal']) {
        expect(looksGibberish(w)).withContext(w).toBeFalse();
      }
    });

    it('flags a repeated character run', () => {
      for (const w of ['aaaaaa', 'hhhhhhh', 'ooooooo']) {
        expect(looksGibberish(w)).withContext(w).toBeTrue();
      }
    });

    it('flags home-row runs', () => {
      for (const w of ['asdfgh', 'qwerty', 'zxcvbn', 'hjklhjkl']) {
        expect(looksGibberish(w)).withContext(w).toBeTrue();
      }
    });

    it('flags near-vowelless consonant mash', () => {
      for (const w of ['bcdfghjkl', 'trwmnpqrst']) {
        expect(looksGibberish(w)).withContext(w).toBeTrue();
      }
    });

    it('does NOT flag real long English symptom words', () => {
      for (const w of ['headache', 'stomach', 'vomiting', 'breathing', 'dizziness',
                       'temperature', 'medicine', 'yesterday']) {
        expect(looksGibberish(w)).withContext(w).toBeFalse();
      }
    });

    it('does NOT flag real long Hinglish words', () => {
      for (const w of ['takleef', 'bukhaar', 'seene', 'pareshani', 'chakkar',
                       'ulti', 'saans', 'dawai', 'peeth']) {
        expect(looksGibberish(w)).withContext(w).toBeFalse();
      }
    });

    it('does NOT flag Devanagari — it strips to empty and is under the length gate', () => {
      for (const w of ['सिरदर्द', 'बुखार', 'दर्द', 'खांसी']) {
        expect(looksGibberish(w)).withContext(w).toBeFalse();
      }
    });
  });

  describe('isLowSignal', () => {
    it('rejects empty and single-character input', () => {
      expect(isLowSignal('', [])).toBeTrue();
      expect(isLowSignal(' ', [])).toBeTrue();
      expect(isLowSignal('a', [])).toBeTrue();
    });

    it('accepts short legitimate triage answers', () => {
      for (const t of ['no', 'yes', 'nahi', 'haan', '3 days', '38', 'ok', 'both']) {
        expect(isLowSignal(t, [])).withContext(t).toBeFalse();
      }
    });

    it('accepts real symptom descriptions in English, Hinglish and Hindi', () => {
      for (const t of [
        'my head hurts since yesterday',
        'mujhe seene me dard ho raha hai',
        'bukhaar hai aur khansi bhi',
        'सिर में तेज़ दर्द है',
        'stomach pain after eating',
      ]) {
        expect(isLowSignal(t, [])).withContext(t).toBeFalse();
      }
    });

    it('rejects an all-gibberish line', () => {
      expect(isLowSignal('asdfgh qwerty zxcvbn', [])).toBeTrue();
    });

    it('a SINGLE real word rescues an otherwise gibberish line', () => {
      // Deliberate: over-blocking someone mid-description is worse than
      // letting one junk line through to the backend classifier.
      expect(isLowSignal('asdfgh headache qwerty', [])).toBeFalse();
    });

    it('flags a substantial exact repeat of a recent turn', () => {
      const line = 'my head has been hurting since yesterday';
      const history = [user(line), user('something else'), user('another thing')];
      expect(isLowSignal(line, history)).toBeTrue();
    });

    it('does NOT flag repeated SHORT answers — the denial-streak trap', () => {
      // "no" answered to five different triage questions must never be read as
      // spam, or a run of denials would block the report.
      const history = [user('no'), user('no'), user('no'), user('no')];
      expect(isLowSignal('no', history)).toBeFalse();
      expect(isLowSignal('nahi', [user('nahi'), user('nahi'), user('nahi'), user('nahi')])).toBeFalse();
    });

    it('ignores assistant turns when looking for repeats', () => {
      const line = 'my head has been hurting since yesterday';
      const history = [
        { role: 'assistant', text: line } as ChatMessage,
        user('a'), user('b'), user('c'),
      ];
      expect(isLowSignal(line, history)).toBeFalse();
    });

    it('only looks at the recent window, not the whole conversation', () => {
      const line = 'my head has been hurting since yesterday';
      // slice(-5, -1) — an old repeat outside the window does not count.
      const history = [user(line), user('a'), user('b'), user('c'), user('d'), user('e')];
      expect(isLowSignal(line, history)).toBeFalse();
    });
  });

  describe('ageFromDob', () => {
    it('returns null for missing or unparseable input', () => {
      for (const v of [null, undefined, '', 'not a date']) {
        expect(ageFromDob(v)).toBeNull();
      }
    });

    it('computes whole years, not yet counting a birthday later this year', () => {
      const now = new Date();
      const turned30 = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate());
      expect(ageFromDob(turned30.toISOString())).toBe(30);

      const birthdayTomorrow = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate() + 1);
      // still 29 until the day arrives
      expect(ageFromDob(birthdayTomorrow.toISOString())).toBe(29);
    });

    it('rejects implausible ages (future dates, > 150 years)', () => {
      const next = new Date(); next.setFullYear(next.getFullYear() + 1);
      expect(ageFromDob(next.toISOString())).toBeNull();
      expect(ageFromDob('1800-01-01')).toBeNull();
    });
  });
});
