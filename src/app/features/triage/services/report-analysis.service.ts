import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AiDoctorStateService } from './ai-doctor-state.service';

/**
 * "Explain My Report" — upload a medical document, get it back in plain words.
 *
 * Every call here needs an account: unlike the consult, which runs anonymously
 * and only gates its exits, there is no signed-out path. The daily allowance has
 * to hang on something, and this endpoint spends real AI quota per upload.
 *
 * The Bearer header is attached by hand on each request, matching
 * AiDoctorApiService — the app's only interceptor covers the owner/partner/admin
 * consoles, not patient calls.
 */

export interface ReportFinding {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'low' | 'normal' | 'high' | 'not_stated';
  /** What THIS patient's number suggests. The only per-patient line here. */
  plainMeaning: string;

  /* ── behind the info button: general facts about the test itself ──────────
     These read the same whatever the patient's own value is, which is what
     makes them safe to show on a normal result — and a normal result is
     exactly when someone taps to ask what the range was for. Absent on
     analyses stored before this shipped; the button hides itself then. */

  /** What the test measures and why a doctor orders it. */
  aboutTest?: string;
  /** What sitting inside the usual range tells you. */
  rangeMeaning?: string;
  /** What a below-range result generally suggests. */
  ifLow?: string;
  /** What an above-range result generally suggests. */
  ifHigh?: string;
}

export type ReportUrgency = 'routine' | 'urgent' | 'emergency';

/** How well the model could actually read the page. */
export type Legibility = 'clear' | 'partial' | 'poor';

/** Slots a dose is taken in, as the card draws them, in day order. */
export type DoseSlot = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Where the dose sits relative to eating. `not_stated` is a real answer and is
 * shown as one: most patients assume "after food", so quietly defaulting to it
 * would hand them an instruction their doctor never wrote.
 */
export type FoodRelation =
  | 'before_food'
  | 'after_food'
  | 'with_food'
  | 'empty_stomach'
  | 'not_stated';

/**
 * One item transcribed off a prescription — including a handwritten one, which
 * is the case patients most often can't read themselves.
 *
 * The structured dosing fields below are the same instruction as `howToTake`,
 * split up so the card can state when to take it and whether it goes before or
 * after food, instead of leaving the patient to decode "1-0-1 p.c. x 5d". They
 * are all optional: analyses stored before they shipped have none of them, and
 * the card falls back to reading `howToTake` for those.
 */
export interface PrescribedMedicine {
  name: string;
  strength: string;
  /** Only what the prescription itself says. Never advice of our own. */
  howToTake: string;
  purpose: string;
  /** tablet, capsule, syrup… as written. */
  form?: string;
  /** How much each time: "1 tablet", "5 ml". */
  dose?: string;
  /** How often, as written: "twice a day", "1-0-1". */
  frequency?: string;
  timesOfDay?: DoseSlot[];
  foodRelation?: FoodRelation;
  /** How long: "5 days", "1 month". */
  duration?: string;
  /** Anything else written on the page ("do not lie down for 30 minutes"). */
  specialInstructions?: string;
  /** false when the model was unsure of its own reading. */
  legible: boolean;
  /** Found in the medicine catalogue? null = the check couldn't run. */
  verified?: boolean | null;
  catalogueName?: string | null;
}

/**
 * The parts of a prescription that are NOT a medicine, and that a patient most
 * often cannot read off the page — the follow-up date above all, which is the
 * single most missed instruction on any prescription.
 *
 * Every field is optional and every one is "as the page says it". The backend
 * fills in what it can actually see; the card renders only what arrived and
 * says nothing at all when a field is absent. That is deliberate: an empty
 * "Next visit" row would be read as "no follow-up needed", which is a claim
 * about someone's care that we are in no position to make.
 */
export interface PrescriptionDetails {
  /** "12 September 2026", "after 5 days", "in 2 weeks" — however it is written. */
  followUp?: string;
  /** What the prescription is for, in the doctor's own words. */
  diagnosis?: string;
  /** Tests or scans the doctor asked for. */
  testsAdvised?: string[];
  /** Non-medicine instructions: rest, fluids, diet, exercises, physiotherapy. */
  generalAdvice?: string[];
  /** The date on the prescription. */
  prescribedOn?: string;
  /** Who wrote it — doctor, clinic, or both. */
  prescriber?: string;
}

export interface ReportAnalysis {
  documentType: 'lab_report' | 'pathology' | 'imaging' | 'discharge' | 'prescription' | 'unknown';
  /**
   * A short name for THIS document, used only when an upload turned out to hold
   * more than one ("Blood test, 12 Sep", "Prescription from Dr Rao"). Absent on
   * single-document analyses and on everything stored before multi-document
   * support shipped — the card falls back to the document type.
   */
  title?: string;
  /** Which of the uploaded files this document was read off. */
  sourceFiles?: string[];
  headline: string;
  findings: ReportFinding[];
  whatThisMeans: string;
  whatToDo: string[];
  questionsForYourDoctor: string[];
  urgency: ReportUrgency;
  urgencyReason: string;
  /** Absent on analyses stored before prescription support shipped. */
  legibility?: Legibility;
  medicines?: PrescribedMedicine[];
  /** Everything on the page that is not a medicine. Absent on older analyses. */
  prescription?: PrescriptionDetails;
  /** Anything the model could not read. Shown as-is: it is why we don't guess. */
  notInterpreted: string[];
}

export interface QuotaStatus {
  tier: 'free' | 'premium';
  limit: number;
  used: number;
  remaining: number;
  /** ISO timestamp of the next local midnight. */
  resetAt: string;
}

export interface AnalysisResponse {
  id: string;
  createdOn: string;
  status: string;
  documentType: string;
  urgency: ReportUrgency;
  /**
   * The first document of the upload, and the only one before multi-document
   * support. Kept alongside `documents` so a stored analysis, a PDF export or a
   * client that predates the change still finds something to render.
   */
  analysis: ReportAnalysis;
  /**
   * Every distinct document found in the upload, in the order they were sent.
   *
   * Three files are not necessarily three documents — a lab report photographed
   * in two halves is one — so the count here is what the model decided, not the
   * file count. Absent on analyses stored before this shipped; read it through
   * `documentsOf()`, which falls back to `[analysis]`.
   */
  documents?: ReportAnalysis[];
  disclaimer: string;
  /** True when the same file had already been explained — costs no allowance. */
  cached?: boolean;
  usage?: QuotaStatus;
}

/**
 * The documents in a response, whatever shape it arrived in.
 *
 * The one place that reconciles new multi-document responses with the single
 * `analysis` that older stored rows carry, so no caller has to remember which
 * it is holding.
 */
export function documentsOf(res: AnalysisResponse | null | undefined): ReportAnalysis[] {
  if (!res) return [];
  if (res.documents?.length) return res.documents;
  return res.analysis ? [res.analysis] : [];
}

export interface AnalysisSummary {
  id: string;
  createdOn: string;
  documentType: string;
  urgency: ReportUrgency;
  headline: string;
  /** How many documents that one upload held. Absent on older rows, meaning 1. */
  documentCount?: number;
}

/** Mirrors the server's caps so a doomed upload never leaves the phone. */
export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/* ── shrinking a photo before it leaves the phone ───────────────────────── */

/**
 * Longest edge we send. A report photographed at 12MP carries no more readable
 * text than the same shot at 2000px — the model is not using those pixels — so
 * everything above this is pure upload time, prompt tokens and latency.
 *
 * 2000 rather than something smaller because these are often HANDWRITTEN
 * prescriptions, where the difference between an "l" and a "1" is a few pixels
 * and a misread drug name is a real harm.
 */
export const MAX_IMAGE_EDGE = 2000;

/** Below this an image is sent untouched — not worth re-encoding. */
const SHRINK_ABOVE_BYTES = 1024 * 1024;

/** JPEG quality for the re-encode. Visually lossless for text on paper. */
const SHRINK_QUALITY = 0.85;

/**
 * Types the browser can reliably decode into a canvas. HEIC/HEIF are missing on
 * purpose: most browsers cannot decode them, `createImageBitmap` throws, and the
 * catch below sends the original — which is the right outcome, just slower to
 * reach if we pretended otherwise.
 */
const SHRINKABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** "report.png" -> "report.jpg", since the bytes really are JPEG now. */
function asJpgName(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.jpg';
}

/**
 * One image, scaled down and re-encoded — or the original file, unchanged.
 *
 * Why this exists: the upload is base64'd into a single Gemini request, and that
 * request has a size ceiling. Three 10MB photos are already past it. Shrinking
 * here cuts a typical phone photo by roughly 10x, which is what makes several
 * files in one upload comfortable rather than marginal.
 *
 * Every failure path returns the ORIGINAL file. A patient's upload must never
 * be blocked because a canvas trick did not work in their browser.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!SHRINKABLE_TYPES.includes(file.type)) return file;
  // Prerendering has no canvas; an older browser may have no createImageBitmap.
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap | null = null;
  try {
    // `from-image` applies the EXIF rotation. Without it a portrait photo is
    // drawn sideways, and a sideways prescription reads far worse.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_IMAGE_EDGE && file.size <= SHRINK_ABOVE_BYTES) return file;

    const scale = Math.min(1, MAX_IMAGE_EDGE / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // White underneath: a transparent PNG would otherwise flatten to black and
    // take the text with it.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', SHRINK_QUALITY),
    );
    // A re-encode that saved nothing is not worth the loss of the original.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], asJpgName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}

/**
 * Every picked file, shrunk where shrinking helps. PDFs pass straight through —
 * re-rendering one in the browser costs more than it saves.
 */
export async function shrinkForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => shrinkImage(f)));
}

@Injectable({ providedIn: 'root' })
export class ReportAnalysisService {
  private http = inject(HttpClient);
  private state = inject(AiDoctorStateService);

  private base = `${environment.serverUrl}${environment.aiBase}`;

  /**
   * Files picked from the chat composer's attach button, waiting for the
   * report-reader page to pick them up on the next navigation.
   *
   * A File can't ride in a route param and re-prompting on arrival would defeat
   * the point of attaching in the chat, so the picker and the page hand off
   * through the service they already share. Read once and cleared, so a later
   * visit to the page never resurrects a stale file.
   */
  private stagedFiles: File[] = [];

  stageFiles(files: File[]): void {
    this.stagedFiles = files;
  }

  takeStagedFiles(): File[] {
    const files = this.stagedFiles;
    this.stagedFiles = [];
    return files;
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.state.authToken || ''}` });
  }

  /**
   * `sessionId` ties the upload to the chat it happened in, so the server can
   * record the turn and the card survives a refresh. Omitted by the standalone
   * page, which has no conversation to record into.
   */
  analyze(files: File[], consent: boolean, sessionId?: string | null): Observable<AnalysisResponse> {
    const form = new FormData();
    for (const file of files) form.append('files', file, file.name);
    form.append('consent', String(consent));
    if (sessionId) form.append('sessionId', sessionId);
    // No Content-Type header: the browser has to set the multipart boundary.
    return this.http.post<AnalysisResponse>(`${this.base}/document/analyze`, form, {
      headers: this.authHeaders(),
    });
  }

  /**
   * A follow-up question about an already-analysed document. Runs over the
   * stored findings JSON server-side, so it is far cheaper than an analysis and
   * counts against its own separate daily allowance.
   */
  askAboutDocument(
    documentId: string,
    question: string,
    sessionId?: string | null,
  ): Observable<{ documentId: string; question: string; answer: string; disclaimer: string }> {
    return this.http.post<{ documentId: string; question: string; answer: string; disclaimer: string }>(
      `${this.base}/document/${documentId}/ask`,
      { question, sessionId: sessionId || undefined },
      { headers: this.authHeaders() },
    );
  }

  getQuota(): Observable<QuotaStatus> {
    return this.http.get<QuotaStatus>(`${this.base}/document/quota`, {
      headers: this.authHeaders(),
    });
  }

  listDocuments(): Observable<{ documents: AnalysisSummary[] }> {
    return this.http.get<{ documents: AnalysisSummary[] }>(`${this.base}/documents`, {
      headers: this.authHeaders(),
    });
  }

  getDocument(id: string): Observable<AnalysisResponse> {
    return this.http.get<AnalysisResponse>(`${this.base}/document/${id}`, {
      headers: this.authHeaders(),
    });
  }

  /**
   * "I'd want more than this." Recorded server-side — this is the only signal
   * that decides whether a paid tier is worth building, so the button that
   * calls it is the point of the limit screen, not decoration on it.
   */
  registerUpgradeInterest(source = 'daily_limit'): Observable<{ recorded: boolean }> {
    return this.http.post<{ recorded: boolean }>(
      `${this.base}/document/upgrade-interest`,
      { mobile: this.state.userMobile || undefined, source },
      { headers: this.authHeaders() },
    );
  }
}
