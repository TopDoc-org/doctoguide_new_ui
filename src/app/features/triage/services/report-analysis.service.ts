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
  plainMeaning: string;
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

export interface ReportAnalysis {
  documentType: 'lab_report' | 'imaging' | 'discharge' | 'prescription' | 'unknown';
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
  analysis: ReportAnalysis;
  disclaimer: string;
  /** True when the same file had already been explained — costs no allowance. */
  cached?: boolean;
  usage?: QuotaStatus;
}

export interface AnalysisSummary {
  id: string;
  createdOn: string;
  documentType: string;
  urgency: ReportUrgency;
  headline: string;
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
