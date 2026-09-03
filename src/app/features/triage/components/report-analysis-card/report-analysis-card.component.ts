import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonComponent } from '../../../../design-system/button/button.component';
import { CardComponent } from '../../../../design-system/card/card.component';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import {
  DoseSlot,
  FoodRelation,
  PrescribedMedicine,
  ReportAnalysis,
  ReportFinding,
  ReportUrgency,
} from '../../services/report-analysis.service';

/** One slot of the day, as the prescription card draws it. */
interface DoseSlotView {
  key: DoseSlot;
  label: string;
  on: boolean;
}

/** Everything the card needs to state when and how one medicine is taken. */
interface DosingView {
  slots: DoseSlotView[];
  /** False when the page never stated a schedule - the row is hidden, not guessed. */
  hasSchedule: boolean;
  /** How much each time: "1 tablet". Empty when unwritten. */
  dose: string;
  /** "Twice a day". Empty when neither written nor derivable from the slots. */
  frequency: string;
  /** "5 days". Empty when unwritten. */
  duration: string;
  food: { label: string; detail: string } | null;
  instructions: string;
  /** The prescription's own line, kept verbatim under the readout. */
  verbatim: string;
}

/**
 * Renders one analysed document: headline, urgency, prescription readout, the
 * findings with their range meters, and the plain-language sections.
 *
 * Purely presentational — it takes an analysis and draws it. That is what lets
 * the same markup serve both the standalone /triage/report-reader page and an
 * assistant turn inside the chat, so a patient sees the identical thing wherever
 * they uploaded from, and there is one place to fix when the wording changes.
 *
 * Every helper below is a pure function of its argument; none touches component
 * state. `retake` is the one output, because "try another photo" belongs to
 * whoever owns the upload flow, not to the renderer.
 */
@Component({
  selector: 'app-report-analysis-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, IconComponent],
  templateUrl: './report-analysis-card.component.html',
})
export class ReportAnalysisCardComponent {
  analysis = input.required<ReportAnalysis>();
  urgency = input<ReportUrgency>('routine');
  disclaimer = input('');
  /** True when the same file had already been explained — no allowance spent. */
  cached = input(false);

  /** "Try another photo" — belongs to whoever owns the upload, not the renderer. */
  retake = output<void>();

  /** Short alias: the template reads `a().findings`, not `analysis().findings`. */
  protected a = this.analysis;

  /**
   * Colour for a finding. Abnormal reads amber, never red — a low haemoglobin is
   * something to look into, and a page of red alarms a patient far past what the
   * number warrants. Red is reserved for `urgency: emergency`.
   */
  protected findingClass(f: ReportFinding): string {
    if (f.status === 'low' || f.status === 'high') {
      return 'border-amber-300/70 bg-amber-50/60';
    }
    return 'border-line/10 bg-surface';
  }

  /**
   * Where a value sits against its own reference range, as a meter.
   *
   * A number like "9.4, usual 13.0-17.0" is the part a patient cannot feel.
   * Seeing the marker sit outside the band communicates "a bit below" vs "far
   * below" in one glance, which the digits alone never do.
   *
   * Returns null whenever the range or the value can't be parsed — a meter drawn
   * from a guessed domain would be a lie, and the text beneath it is already
   * complete without one.
   */
  protected meter(f: ReportFinding): {
    bandLeft: number;
    bandWidth: number;
    pos: number;
    outside: boolean;
    clamped: 'low' | 'high' | null;
  } | null {
    const value = this.toNumber(f.value);
    if (value === null) return null;

    const range = this.parseRange(f.referenceRange);
    if (!range) return null;
    const { lo, hi, oneSided } = range;
    if (!(hi > lo)) return null;

    // Pad the plotted domain either side of the normal band so an out-of-range
    // value still lands on the track instead of falling off it.
    //
    // A one-sided range gets no padding on its open side: "< 5.7" means anything
    // below 5.7 is fine, so the band has to run to the very edge of the track. A
    // band floating in from the left would tell the patient that a LOW HbA1c is
    // also a problem, which is both false and alarming.
    const pad = (hi - lo) * 0.6;
    const domainLo = oneSided === 'upper' ? lo : lo - pad;
    const domainHi = oneSided === 'lower' ? hi : hi + pad;
    const span = domainHi - domainLo;

    const raw = ((value - domainLo) / span) * 100;
    // Keep the marker inside the track; anything past the edge is flagged so the
    // UI can show a "beyond this" note rather than pretending it sits at the end.
    const pos = Math.max(2, Math.min(98, raw));
    return {
      bandLeft: ((lo - domainLo) / span) * 100,
      bandWidth: ((hi - lo) / span) * 100,
      pos,
      outside: value < lo || value > hi,
      clamped: raw < 2 ? 'low' : raw > 98 ? 'high' : null,
    };
  }

  /** "9.4", "1,50,000", "< 0.01" -> number. Null when there is nothing to plot. */
  private toNumber(value: string): number | null {
    if (!value) return null;
    const m = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Reference ranges as labs actually print them: "13.0 - 17.0", "4,000 - 11,000",
   * "< 5.7", "> 40", "0-15" (and with en/em dashes).
   */
  private parseRange(
    text: string,
  ): { lo: number; hi: number; oneSided: 'upper' | 'lower' | null } | null {
    if (!text) return null;
    const clean = String(text).replace(/,/g, '').replace(/[–—]/g, '-').trim();

    const two = clean.match(/(-?\d+(?:\.\d+)?)\s*(?:-|to)\s*(-?\d+(?:\.\d+)?)/i);
    if (two) {
      const lo = parseFloat(two[1]);
      const hi = parseFloat(two[2]);
      return Number.isFinite(lo) && Number.isFinite(hi) ? { lo, hi, oneSided: null } : null;
    }

    const upper = clean.match(/^[<≤]\s*(-?\d+(?:\.\d+)?)/);
    if (upper) {
      const hi = parseFloat(upper[1]);
      // "< 200" reads as "anywhere from zero up to 200".
      return Number.isFinite(hi) ? { lo: 0, hi, oneSided: 'upper' } : null;
    }

    const lower = clean.match(/^[>≥]\s*(-?\d+(?:\.\d+)?)/);
    if (lower) {
      const lo = parseFloat(lower[1]);
      return Number.isFinite(lo) ? { lo, hi: lo * 2, oneSided: 'lower' } : null;
    }
    return null;
  }

  /** Plain-language summary of the meter, for screen readers. */
  protected meterLabel(f: ReportFinding): string {
    return `${f.name}: ${f.value} ${f.unit}. Usual range ${f.referenceRange}. ${this.statusLabel(f)}.`;
  }

  /** How many values came back inside their usual range — the calming headline. */
  protected inRangeCount(findings: ReportFinding[]): number {
    return findings.filter((f) => f.status === 'normal').length;
  }

  /** Does any finding plot a meter? The legend is noise on a page of vitals. */
  protected anyMeter(findings: ReportFinding[]): boolean {
    return findings.some((f) => this.meter(f) !== null);
  }

  /**
   * How many findings actually carry a status.
   *
   * A page of vitals copied off an OPD ticket ("BP 100/71", "Pulse 96") has no
   * printed reference ranges, so every status is `not_stated` — and the count
   * then read "0 of 4 in the usual range", which tells a patient with four
   * perfectly normal readings that none of them are. The tally is hidden unless
   * at least one finding was actually compared against a range.
   */
  protected statedCount(findings: ReportFinding[]): number {
    return findings.filter((f) => f.status !== 'not_stated').length;
  }

  /**
   * "for blood sugar", "to coat the stomach lining", "prenatal supplement" —
   * the model phrases a purpose all three ways, and the template reads
   * "Generally {purpose}". A bare noun phrase needs the "for" the sentence is
   * missing; one that already starts with a preposition must not get a second.
   */
  protected purposePhrase(purpose: string): string {
    const p = String(purpose || '').trim();
    if (!p) return '';
    return /^(for|to|as|against|in )/i.test(p) ? p : `for ${p}`;
  }

  /** First letter up, for a chip like "at night" sitting in a row of labels. */
  private sentenceCase(text: string): string {
    const t = String(text || '').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }

  /* -- prescriptions ---------------------------------------------------- */

  /**
   * One medicine's instructions, resolved into the parts a patient has to act
   * on: which slots of the day, how much each time, before or after food, and
   * for how long.
   *
   * The server now sends these split out, because "1-0-1 p.c. x 5d" is the line
   * a patient most often cannot decode - and the line where a misreading turns
   * into a wrong dose. Analyses stored before that shipped carry only the
   * verbatim `howToTake`, so anything missing is read back off that string here.
   * Both paths obey the same rule as the prompt: a field the prescription never
   * stated stays empty and the card says so, rather than defaulting to the
   * "after food, twice a day" everybody assumes.
   */
  protected dosing(m: PrescribedMedicine): DosingView {
    const written = m.howToTake || '';
    const slots = m.timesOfDay?.length ? m.timesOfDay : this.parseSlots(written);
    const relation: FoodRelation =
      m.foodRelation && m.foodRelation !== 'not_stated'
        ? m.foodRelation
        : this.parseFoodRelation(written);

    return {
      slots: this.SLOTS.map((slot) => ({ ...slot, on: slots.includes(slot.key) })),
      hasSchedule: slots.length > 0,
      dose: (m.dose || '').trim() || this.parseDose(written),
      frequency: this.sentenceCase((m.frequency || '').trim()) || this.frequencyFromSlots(slots),
      duration: (m.duration || '').trim() || this.parseDuration(written),
      food: this.foodLabel(relation),
      instructions: (m.specialInstructions || '').trim(),
      verbatim: written,
    };
  }

  /** The day, in the order it happens. Fixed, so every medicine reads alike. */
  private readonly SLOTS: { key: DoseSlot; label: string }[] = [
    { key: 'morning', label: 'Morning' },
    { key: 'afternoon', label: 'Afternoon' },
    { key: 'evening', label: 'Evening' },
    { key: 'night', label: 'Night' },
  ];

  /**
   * Before or after food, in words a patient can follow, with the part that
   * actually matters - the gap around the meal - spelled out. `not_stated`
   * returns null: the card then says the prescription did not say, which is the
   * honest answer and the one that sends them to ask.
   */
  private foodLabel(relation: FoodRelation): { label: string; detail: string } | null {
    switch (relation) {
      case 'before_food':
        return { label: 'Before food', detail: 'about 30 minutes before the meal' };
      case 'after_food':
        return { label: 'After food', detail: 'soon after the meal, not on an empty stomach' };
      case 'with_food':
        return { label: 'With food', detail: 'during the meal' };
      case 'empty_stomach':
        return {
          label: 'On an empty stomach',
          detail: 'before eating or drinking anything',
        };
      default:
        return null;
    }
  }

  /**
   * A prescription's daily rhythm, from what the doctor wrote: "1-0-1",
   * "1-0-0-1", "OD"/"BD"/"TDS"/"QID", "at bedtime", "HS". Returns an empty list
   * when the schedule isn't stated in a form we can read - never a guessed one.
   */
  private parseSlots(howToTake: string): DoseSlot[] {
    if (!howToTake) return [];
    const t = howToTake.toLowerCase();

    // The four-slot form, morning-afternoon-evening-night. Checked before the
    // three-slot pattern, which "1-0-0-1" would also match.
    const quad = t.match(/(\d)\s*-\s*(\d)\s*-\s*(\d)\s*-\s*(\d)/);
    if (quad) {
      return this.SLOTS.map((s, i) => (+quad[i + 1] > 0 ? s.key : null)).filter(
        (k): k is DoseSlot => k !== null,
      );
    }
    // The Indian "1-0-1" convention: morning-afternoon-night.
    const triple = t.match(/(\d)\s*-\s*(\d)\s*-\s*(\d)/);
    if (triple) {
      const keys: DoseSlot[] = ['morning', 'afternoon', 'night'];
      return keys.filter((_, i) => +triple[i + 1] > 0);
    }
    if (/\bqid\b|\bqds\b|four times/.test(t)) {
      return ['morning', 'afternoon', 'evening', 'night'];
    }
    if (/\b(hs|bedtime|at night|night)\b/.test(t)) return ['night'];
    if (/\btds\b|\btid\b|three times/.test(t)) return ['morning', 'afternoon', 'night'];
    if (/\bbd\b|\bbid\b|twice/.test(t)) return ['morning', 'night'];
    if (/\bod\b|\bonce\b|\bdaily\b/.test(t)) return ['morning'];
    return [];
  }

  /** "1 tablet twice a day after food" -> "1 tablet". Empty when unwritten. */
  private parseDose(howToTake: string): string {
    const m = String(howToTake || '').match(
      /(\d+(?:\.\d+)?|half|quarter)\s*(tablets?|tabs?|capsules?|caps?|ml|drops?|puffs?|tsp|teaspoons?|sachets?|units?)\b/i,
    );
    return m ? `${m[1]} ${m[2]}`.toLowerCase() : '';
  }

  /** "... x 5 days", "for 1 month" -> "5 days" / "1 month". Empty when unwritten. */
  private parseDuration(howToTake: string): string {
    const m = String(howToTake || '').match(/(?:for|x)\s*(\d+)\s*(days?|d|weeks?|wks?|months?)\b/i);
    if (!m) return '';
    const n = m[1];
    const unit = m[2].toLowerCase();
    const word = unit.startsWith('d') ? 'day' : unit.startsWith('w') ? 'week' : 'month';
    return `${n} ${word}${n === '1' ? '' : 's'}`;
  }

  /**
   * Before/after food out of the written line, including the abbreviations that
   * are half the reason a patient can't read their own prescription: "a.c."
   * (ante cibum, before food) and "p.c." (post cibum, after food).
   */
  private parseFoodRelation(howToTake: string): FoodRelation {
    const t = String(howToTake || '').toLowerCase();
    if (/empty\s*stomach|khaali\s*pet|fasting/.test(t)) return 'empty_stomach';
    if (/before\s*(food|meals?|breakfast|lunch|dinner|eating)|\ba\.?c\.?\b/.test(t)) {
      return 'before_food';
    }
    if (/after\s*(food|meals?|breakfast|lunch|dinner|eating)|post[\s-]*food|\bp\.?c\.?\b/.test(t)) {
      return 'after_food';
    }
    if (/with\s*(food|meals?|milk)/.test(t)) return 'with_food';
    return 'not_stated';
  }

  /** "Twice a day", from the slots - a restatement of them, never an addition. */
  private frequencyFromSlots(slots: DoseSlot[]): string {
    switch (slots.length) {
      case 1:
        return 'Once a day';
      case 2:
        return 'Twice a day';
      case 3:
        return 'Three times a day';
      case 4:
        return 'Four times a day';
      default:
        return '';
    }
  }

  /** Plain-language summary of one medicine's timing, for screen readers. */
  protected dosingLabel(m: PrescribedMedicine): string {
    const d = this.dosing(m);
    const on = d.slots.filter((s) => s.on).map((s) => s.label.toLowerCase());
    const when = on.length ? `taken ${on.join(', ')}` : 'no schedule written on the prescription';
    const dose = d.dose ? `${d.dose}, ` : '';
    const food = d.food ? `, ${d.food.label.toLowerCase()}` : '';
    const days = d.duration ? `, for ${d.duration}` : '';
    return `${m.name}: ${dose}${when}${food}${days}.`;
  }

  protected statusLabel(f: ReportFinding): string {
    switch (f.status) {
      case 'low':
        return 'Below the usual range';
      case 'high':
        return 'Above the usual range';
      case 'normal':
        return 'In the usual range';
      default:
        return 'Range not stated';
    }
  }

  protected urgencyLabel(u: string): string {
    if (u === 'emergency') return 'Needs medical attention today';
    if (u === 'urgent') return 'Worth seeing a doctor soon';
    return 'Nothing urgent here';
  }

  protected medicineNeedsCheck(m: PrescribedMedicine): boolean {
    return !m.legible || m.verified === false;
  }
}
