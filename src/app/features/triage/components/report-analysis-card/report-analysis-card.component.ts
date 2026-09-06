import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { ButtonComponent } from '../../../../design-system/button/button.component';
import { CardComponent } from '../../../../design-system/card/card.component';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import {
  DoseSlot,
  FoodRelation,
  PrescribedMedicine,
  PrescriptionDetails,
  ReportAnalysis,
  ReportFinding,
  ReportUrgency,
} from '../../services/report-analysis.service';

/** One slot of the day, as the prescription card draws it. */
interface DoseSlotView {
  key: DoseSlot;
  label: string;
  /** Sunrise / sun / sunset / moon — the day read as pictures, not as a table. */
  icon: string;
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
  food: { label: string; detail: string; showDetail: boolean } | null;
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
  /**
   * Where this document sits in the upload, 1-based, and how many came back.
   *
   * Only meaningful when one upload held several distinct documents: three
   * cards in a row with three unrelated headlines are unreadable without saying
   * which is which. A lone document leaves `total` at 1 and no header renders,
   * so the single-document case looks exactly as it always did.
   */
  index = input(1);
  total = input(1);

  /** "Try another photo" — belongs to whoever owns the upload, not the renderer. */
  retake = output<void>();

  /** Short alias: the template reads `a().findings`, not `analysis().findings`. */
  protected a = this.analysis;

  /**
   * Which findings have their "what is this test?" panel open, by name.
   *
   * Keyed by name rather than index so a card that re-renders with the same
   * findings keeps whatever the patient had opened. Several can be open at
   * once: comparing two values is the reason someone opens the second one, and
   * an accordion that shuts the first would fight that.
   */
  private openInfo = signal<ReadonlySet<string>>(new Set());

  protected infoOpen(f: ReportFinding): boolean {
    return this.openInfo().has(f.name);
  }

  protected toggleInfo(f: ReportFinding): void {
    this.openInfo.update((open) => {
      const next = new Set(open);
      if (!next.delete(f.name)) next.add(f.name);
      return next;
    });
  }

  /**
   * Is there anything behind the info button for this finding?
   *
   * Analyses stored before these fields existed have none of them, and the
   * model leaves one empty rather than guessing at a test it does not know. In
   * both cases the button must not appear at all — a control that opens an
   * empty panel is worse than no control.
   */
  protected hasInfo(f: ReportFinding): boolean {
    return !!(f.aboutTest || f.rangeMeaning || f.ifLow || f.ifHigh);
  }

  /** Screen-reader name for the button — "what is X?", not a bare "info". */
  protected infoLabel(f: ReportFinding): string {
    return this.infoOpen(f) ? `Hide what ${f.name} means` : `What does ${f.name} mean?`;
  }

  /** Stable id so the button's aria-controls points at its own panel. */
  protected infoPanelId(f: ReportFinding): string {
    return 'finding-info-' + f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /**
   * Colour for a finding. Abnormal reads amber, never red — a low haemoglobin is
   * something to look into, and a page of red alarms a patient far past what the
   * number warrants. Red is reserved for `urgency: emergency`.
   */
  protected findingClass(f: ReportFinding): string {
    if (f.status === 'low' || f.status === 'high') {
      return 'border-warning-line/70 bg-warning-tint/60';
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

  /** "9.4", "1,50,000", "< 0.01", "0,73" -> number. Null when nothing to plot. */
  private toNumber(value: string): number | null {
    if (!value) return null;
    const m = String(value).match(ReportAnalysisCardComponent.NUMBER);
    return m ? this.parseDecimal(m[0]) : null;
  }

  /** A printed number, either separator convention. Allows "1,50,000" and "2,40". */
  private static readonly NUMBER = /-?\d+(?:[.,]\d+)*/;

  /**
   * One printed number, whichever way the lab writes its separators.
   *
   * Much of Europe and India prints "0,73" where others print "0.73", and the
   * same page prints "4,000" meaning four thousand. Stripping every comma read
   * a normal creatinine of "0,73" as 73 and put the marker off the end of its
   * own track. Told apart the same way the server does it (documentSafety
   * parseNumber): two or more commas is grouping, one comma before exactly
   * three digits is grouping, anything else is a decimal comma.
   */
  private parseDecimal(text: string): number | null {
    let t = text;
    const lastDot = t.lastIndexOf('.');
    const lastComma = t.lastIndexOf(',');
    if (lastDot !== -1 && lastComma !== -1) {
      t = lastComma > lastDot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    } else if (lastComma !== -1) {
      const single = (t.match(/,/g) || []).length === 1;
      t = single && !/,\d{3}(?!\d)/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
    }
    const n = parseFloat(t);
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
    // Separators are resolved per number by parseDecimal, not stripped up front:
    // "2,40-5,70" is two decimals, "4,000 - 11,000" is two grouped thousands,
    // and telling them apart is exactly what the old blanket strip could not do.
    const clean = String(text).replace(/[–—]/g, '-').trim();
    const N = ReportAnalysisCardComponent.NUMBER.source;

    const two = clean.match(new RegExp(`(${N})\\s*(?:-|to)\\s*(${N})`, 'i'));
    if (two) {
      const lo = this.parseDecimal(two[1]);
      const hi = this.parseDecimal(two[2]);
      return lo !== null && hi !== null ? { lo, hi, oneSided: null } : null;
    }

    const upper = clean.match(new RegExp(`^[<≤]\\s*(${N})`));
    if (upper) {
      const hi = this.parseDecimal(upper[1]);
      // "< 200" reads as "anywhere from zero up to 200".
      return hi !== null ? { lo: 0, hi, oneSided: 'upper' } : null;
    }

    const lower = clean.match(new RegExp(`^[>≥]\\s*(${N})`));
    if (lower) {
      const lo = this.parseDecimal(lower[1]);
      return lo !== null ? { lo, hi: lo * 2, oneSided: 'lower' } : null;
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
    const dose = (m.dose || '').trim() || this.parseDose(written);
    const relation: FoodRelation =
      m.foodRelation && m.foodRelation !== 'not_stated'
        ? m.foodRelation
        : this.parseFoodRelation(written);

    return {
      slots: this.SLOTS.map((slot) => ({ ...slot, on: slots.includes(slot.key) })),
      hasSchedule: slots.length > 0,
      dose: dose,
      frequency: this.plainFrequency(m.frequency) || this.frequencyFromSlots(slots),
      duration: (m.duration || '').trim() || this.parseDuration(written),
      food: this.foodLabel(relation),
      instructions: (m.specialInstructions || '').trim(),
      verbatim: written,
    };
  }

  /**
   * The day, in the order it happens. Fixed, so every medicine reads alike.
   *
   * The icons are the arc of one day and are only legible AS A SEQUENCE —
   * sunrise, high sun, sunset, moon. That is why all four always render, even
   * the ones with no dose: drop the empty ones and the remaining icons stop
   * being a time of day and become decoration. The label survives as the
   * `title` and inside the container's `aria-label`, so nothing depends on
   * reading the picture.
   */
  private readonly SLOTS: { key: DoseSlot; label: string; icon: string }[] = [
    { key: 'morning', label: 'Morning', icon: 'sunrise' },
    { key: 'afternoon', label: 'Afternoon', icon: 'sun' },
    { key: 'evening', label: 'Evening', icon: 'sunset' },
    { key: 'night', label: 'Night', icon: 'moon' },
  ];

  /**
   * Before or after food, in words a patient can follow, with the part that
   * actually matters - the gap around the meal - spelled out. `not_stated`
   * returns null: the card then says the prescription did not say, which is the
   * honest answer and the one that sends them to ask.
   */
  private foodLabel(
    relation: FoodRelation,
  ): { label: string; detail: string; showDetail: boolean } | null {
    switch (relation) {
      // `showDetail` is the difference between a detail that adds a FACT and
      // one that restates the label. "Before food" alone leaves the reader
      // guessing how long before, so the 30 minutes is spelled out on screen.
      // "After food" and "With food" say themselves; their detail stays as the
      // title, and is not worth a line of a card that has five of these.
      case 'before_food':
        return {
          label: 'Before food',
          detail: 'about 30 minutes before the meal',
          showDetail: true,
        };
      case 'after_food':
        return {
          label: 'After food',
          detail: 'soon after the meal, not on an empty stomach',
          showDetail: false,
        };
      case 'with_food':
        return { label: 'With food', detail: 'during the meal', showDetail: false };
      case 'empty_stomach':
        return {
          // Also a fact, not a restatement: "empty stomach" does not tell a
          // reader that DRINKING counts too.
          label: 'On an empty stomach',
          detail: 'before eating or drinking anything',
          showDetail: true,
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

  /** The non-medicine half of the page. Absent on analyses stored before it. */
  protected rx(): PrescriptionDetails | null {
    return this.a().prescription || null;
  }

  /**
   * "12 September" -> "on 12 September"; "after 5 days" -> "after 5 days".
   *
   * The backend returns the follow-up however the page wrote it, and the two
   * shapes need different words in front of them. Without this the row reads
   * "Go back to the doctor 12 September", which is the kind of small wrongness
   * that makes a patient re-read a line they should be able to act on.
   *
   * Anything already starting with its own preposition is left alone, and
   * anything unrecognised falls through unprefixed rather than being forced
   * into a phrasing that might not fit.
   */
  protected followUpPhrase(raw: string): string {
    const t = (raw || '').trim();
    if (!t) return '';
    if (/^(on|after|in|before|within|every)/i.test(t)) return t;
    // A bare date or day name takes "on".
    if (/^\d|^(mon|tue|wed|thu|fri|sat|sun)/i.test(t)) return `on ${t}`;
    return t;
  }

  /** True when ANY medicine is uncertain — drives the one shared warning. */
  protected anyNeedsCheck(): boolean {
    return (this.a().medicines || []).some((m) => this.medicineNeedsCheck(m));
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
    return this.frequencyFromCount(slots.length);
  }

  private frequencyFromCount(n: number): string {
    switch (n) {
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

  /**
   * The API's `frequency` is whatever the prescription said, and prescriptions
   * say it in code: "1-0-1", "BD", "TDS", "HS". That is precise to a pharmacist
   * and unreadable to the person actually swallowing the tablet, who is who
   * this card is written for — "1-0-1" was reaching the screen verbatim.
   *
   * Known notation is translated. Anything else that is PURE notation (no
   * letters at all) is dropped in favour of the wording derived from the slots:
   * a chip the reader cannot decode is worse than no chip, and the slot grid
   * directly above it has already said the same thing in words.
   *
   * Nothing here invents a frequency — every branch restates what was written.
   */
  private plainFrequency(raw: string | undefined): string {
    const t = (raw || '').trim();
    if (!t) return '';

    // "1-0-1", "0-0-1", "1-1-1-1", "1/2-0-1": count the doses, not the dashes.
    const notation = t.replace(/\s/g, '');
    if (/^\d+(?:[./]\d+)?(?:[-–]\d+(?:[./]\d+)?)+$/.test(notation)) {
      const taken = notation
        .split(/[-–]/)
        .filter((part) => this.numeric(part) > 0).length;
      return this.frequencyFromCount(taken);
    }

    const key = t.toLowerCase().replace(/[.\s]/g, '');
    const spelled: Record<string, string> = {
      od: 'Once a day',
      qd: 'Once a day',
      bd: 'Twice a day',
      bid: 'Twice a day',
      tds: 'Three times a day',
      tid: 'Three times a day',
      qid: 'Four times a day',
      qds: 'Four times a day',
      hs: 'At night',
      nocte: 'At night',
      sos: 'Only when needed',
      prn: 'Only when needed',
    };
    if (spelled[key]) return spelled[key];

    // No letters and not a notation we recognise -> say nothing rather than
    // show the reader a code.
    if (!/[a-z]/i.test(t)) return '';

    return this.sentenceCase(t);
  }

  /** "1/2" -> 0.5, "1" -> 1. Halves are written as fractions on prescriptions. */
  private numeric(part: string): number {
    const frac = part.match(/^(\d+)\/(\d+)$/);
    if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : 0;
    return parseFloat(part) || 0;
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

  /**
   * "Prescription from Dr Rao", or failing a title from the server, the kind of
   * document this is. Never empty when it is shown — the header only renders
   * for a multi-document upload, where an unlabelled card is the problem it
   * exists to solve.
   */
  protected docTitle(): string {
    const given = (this.a().title || '').trim();
    if (given) return given;
    return this.documentTypeLabel(this.a().documentType);
  }

  private documentTypeLabel(type: string): string {
    switch (type) {
      case 'lab_report':
        return 'Lab report';
      case 'pathology':
        return 'Biopsy report';
      case 'imaging':
        return 'Scan report';
      case 'discharge':
        return 'Discharge summary';
      case 'prescription':
        return 'Prescription';
      default:
        return 'Document';
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
