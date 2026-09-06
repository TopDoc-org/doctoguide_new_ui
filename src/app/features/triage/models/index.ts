export type Role = 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  text: string;
  intent?: string;
  /**
   * What this turn IS. Absent means plain text, so every message the chat has
   * ever produced keeps rendering exactly as before; only an uploaded report
   * renders as something other than a bubble.
   */
  kind?: 'text' | 'document';
  /**
   * The analysed document behind a `kind: 'document'` turn. Persisted on the
   * server message (sessionService.appendMessage's `meta`), because chat history
   * is rehydrated from the session — a card that lived only in the browser would
   * vanish on refresh.
   */
  documentId?: string;
  /** Resolved for rendering: fetched by `documentId` when history is rehydrated. */
  analysis?: import('../services/report-analysis.service').ReportAnalysis;
  /**
   * Every document the upload held, when it held more than one — a lab report
   * and the prescription written off it, photographed together. One turn, one
   * `documentId`, several cards: they were uploaded as one act and the
   * follow-up thread covers all of them, so splitting them into separate chat
   * turns would misrepresent both.
   *
   * Always contains `analysis` as its first entry, so anything that only knows
   * about the single field still shows the same document it always did.
   */
  analyses?: import('../services/report-analysis.service').ReportAnalysis[];
  /** Urgency of that analysis, so the card can colour its banner. */
  documentUrgency?: import('../services/report-analysis.service').ReportUrgency;
  /** Set while an upload is in flight, so the placeholder can show a spinner. */
  pending?: boolean;
  /**
   * A restored card the patient can re-open questions on.
   *
   * Set when history is rehydrated, instead of silently putting the composer
   * back into document mode: after a refresh, typing must go to the symptom
   * interview unless the patient says otherwise on this specific report.
   */
  canAskAbout?: boolean;
}

export interface PossibleCause {
  cause: string;
  likelihood?: string;
  note?: string;
}

export interface Soap {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface PlanItem {
  name: string;
  why?: string;
}

export interface CarePlan {
  labs?: PlanItem[];
  imaging?: PlanItem[];
  management?: string[];
  referral?: string;
  whenToSeekUrgent?: string;
}

// AI's self-rated confidence in the generated report. Absent on reports
// generated before this feature shipped.
export interface ConfidenceAssessment {
  score: number; // 0-100
  level: 'low' | 'moderate' | 'high';
  // Optional because these come off an API response, not a constructor:
  // older reports and partial responses omit them, which is exactly what
  // every reader already guards for.
  factors?: string[];
  missing?: string[];
}

// One recommended specialist. Reports can suggest 1-3 (ranked, first = primary)
// when the possible causes span specialties (e.g. Urologist + Nephrologist).
export interface SpecialtySuggestion {
  specialty: string;
  why?: string;
  primary?: boolean;
}

export interface Report {
  summary: string;
  assessmentIntro?: string;
  possibleCauses: PossibleCause[];
  plan?: CarePlan;
  soap: Soap;
  suggestedSpecialty: string;
  // Ranked list; absent on reports generated before multi-specialist shipped.
  suggestedSpecialties?: SpecialtySuggestion[];
  confidence?: ConfidenceAssessment;
  // Triage level, decided by the backend's deterministic engine (the model may
  // raise it, never soften it). Drives the urgency banner and the primary CTA.
  urgency?: { level: 'emergency' | 'urgent' | 'routine'; reason?: string };
  // Patient-facing context, added in the V2 report. Optional — reports generated
  // before this shipped simply don't render these sections.
  whyConcerned?: string;
  whatYouToldUs?: string[];
  missingInfo?: string[];
  disclaimer?: string;
  generatedAt?: string;
}

// One city/area suggestion for the doctor-location prompt. Carries the exact
// point so a picked place never has to be geocoded from its name again.
export interface PlaceSuggestion {
  label: string;
  city: string;
  state?: string | null;
  country?: string | null;
  countryCode?: string | null;
  lat: number;
  lng: number;
}

// A discount/offer a partner clinic configured for the funnel.
export interface PartnerOffer {
  title: string;
  description?: string;
  discountText?: string; // e.g. "20% off first consult"
}

export interface Doctor {
  name: string;
  rating?: number | null;
  userRatingsTotal?: number | null;
  address?: string;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  hours?: string | null;
  openNow?: boolean | null;
  placeId?: string;
  mapsUrl?: string;
  // True only when the result's name/category actually reflects the requested
  // specialty (set by the backend). Used to avoid claiming a false "match".
  matchesSpecialty?: boolean;
  // Affiliate (partner clinic) fields — present only on partner matches.
  isPartner?: boolean;
  clinicId?: string;
  clinicName?: string;
  specialty?: string;
  bookingUrl?: string;
  offer?: PartnerOffer;
}

// Backend /message response (discriminated by `type`).
export interface MessageResponse {
  intent: string;
  type:
    | 'question'
    | 'report'
    | 'emergency'
    | 'refusal'
    | 'medicine_info'
    | 'general_health'
    | 'out_of_scope'
    | 'find_doctor';
  message?: string;
  question?: string;
  // Tap-to-answer chips for a `type: 'question'` turn. Present (possibly empty) only
  // when the answer set is closed enough that tapping loses no detail — open,
  // numeric and detail-bearing questions come back with [] and stay free-text.
  options?: string[];
  report?: Report;
  emergencyNumbers?: { all: string; ambulance: string };
  sources?: any[];
  suggestedSpecialty?: string | null;
  suggestedSpecialties?: SpecialtySuggestion[] | null;
  needsLocation?: boolean;
  nextAction?: string;
  askedCount?: number;
  progress?: number;
  stepsLeft?: number;
  // True when this report replaced an earlier one (post-report amend flow).
  updated?: boolean;
  disclaimer?: string;
}

export interface DoctorsResponse {
  doctors: Doctor[];
  affiliateDoctors?: Doctor[]; // prioritized partner-clinic matches
  affiliateOffer?: PartnerOffer; // clinic-wide offer banner
  needsLocation?: boolean;
  cached?: boolean;
  specialty?: string;
  error?: string;
  disclaimer?: string;
}

export interface GeoLocation {
  lat: number | null;
  lng: number | null;
  city: string | null;
  district?: string | null;
  state?: string | null;
}
