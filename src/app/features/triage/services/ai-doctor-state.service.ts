import { Injectable } from '@angular/core';
import { storage } from '../../../core/platform/platform';
import { ChatMessage, GeoLocation, Report, SpecialtySuggestion } from '../models';

const LS_SESSION = 'aiDoctorSessionId';
const LS_PREV_SESSION = 'aiDoctorPrevSessionId';
const LS_LEAD = 'aiDoctorLeadCaptured';
const LS_FEEDBACK = 'aiDoctorFeedbackDone';
const LS_CONSENT = 'aiDoctorConsent';
const LS_REPORT_TRACKED = 'aiDoctorReportTracked';
const LS_TOKEN = 'aiDoctorToken';
const LS_USERID = 'aiDoctorUserId';
const LS_USERNAME = 'aiDoctorUserName';
const LS_USERMOBILE = 'aiDoctorUserMobile';
const LS_DOC_CONSENT = 'aiDoctorDocConsent';

// Lightweight session state. sessionId persists in localStorage so a refresh
// resumes the same anonymous session; chat history is rehydrated from the server.
//
// Every localStorage touch goes through `storage`, which no-ops during
// prerender. v1 read localStorage unguarded here and got away with it only
// because /triage was excluded from prerendering — but LandingComponent also
// reads userName/userMobile off this service, and `/` IS prerendered.
/** Mirrors `QuotaStatus` from report-analysis.service, kept structural so this
 *  service does not depend on a feature service it is a peer of. */
export interface DocumentQuota {
  tier: 'free' | 'premium';
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
}

@Injectable({ providedIn: 'root' })
export class AiDoctorStateService {
  messages: ChatMessage[] = [];
  report: Report | null = null;
  location: GeoLocation | null = null;
  suggestedSpecialty: string | null = null;
  // Full ranked list from the report (1-3 entries); empty for legacy reports.
  suggestedSpecialties: SpecialtySuggestion[] = [];
  // The specialist the user picked from the cards; null = primary/legacy single.
  selectedSpecialty: string | null = null;

  get sessionId(): string | null { return storage.get(LS_SESSION); }
  set sessionId(id: string | null) {
    if (id) storage.set(LS_SESSION, id); else storage.remove(LS_SESSION);
  }

  // Last session left behind without an account — offered back to the user
  // via the "load previous chat" banner until loaded or dismissed.
  get prevSessionId(): string | null { return storage.get(LS_PREV_SESSION); }
  set prevSessionId(id: string | null) {
    if (id) storage.set(LS_PREV_SESSION, id); else storage.remove(LS_PREV_SESSION);
  }

  // Park the current session as "previous" (recoverable from the banner),
  // then clear live state so the next visit starts a fresh chat.
  stashSession(): void {
    if (this.sessionId) this.prevSessionId = this.sessionId;
    this.reset();
  }

  get leadCaptured(): boolean { return storage.get(LS_LEAD) === '1'; }
  set leadCaptured(v: boolean) { storage.set(LS_LEAD, v ? '1' : '0'); }

  // Whether the user has rated the report this session — collapses the inline
  // feedback form into a "thank you" state and prevents re-submission.
  get feedbackSubmitted(): boolean { return storage.get(LS_FEEDBACK) === '1'; }
  set feedbackSubmitted(v: boolean) { storage.set(LS_FEEDBACK, v ? '1' : '0'); }

  // Whether the `report_generated` analytics event has already fired for this
  // consult. The report object is re-assigned on every rehydrate (page refresh,
  // opening a past consult) and again on each amend, so without this latch the
  // conversion would be counted several times for one consult. Cleared by
  // reset(), which is what "New chat" runs — so the next consult counts again.
  get reportTracked(): boolean { return storage.get(LS_REPORT_TRACKED) === '1'; }
  set reportTracked(v: boolean) { storage.set(LS_REPORT_TRACKED, v ? '1' : '0'); }

  get consented(): boolean { return storage.get(LS_CONSENT) === '1'; }
  set consented(v: boolean) { storage.set(LS_CONSENT, v ? '1' : '0'); }

  // --- Auth (PIN account). Persisted so a returning user stays logged in and
  // can reach their consult history. Survives reset() (New chat). ---
  get authToken(): string | null { return storage.get(LS_TOKEN); }
  set authToken(t: string | null) {
    if (t) storage.set(LS_TOKEN, t); else storage.remove(LS_TOKEN);
  }

  get userId(): string | null { return storage.get(LS_USERID); }
  set userId(id: string | null) {
    if (id) storage.set(LS_USERID, id); else storage.remove(LS_USERID);
  }

  get userName(): string | null { return storage.get(LS_USERNAME); }
  set userName(n: string | null) {
    if (n) storage.set(LS_USERNAME, n); else storage.remove(LS_USERNAME);
  }

  get userMobile(): string | null { return storage.get(LS_USERMOBILE); }
  set userMobile(m: string | null) {
    if (m) storage.set(LS_USERMOBILE, m); else storage.remove(LS_USERMOBILE);
  }

  /**
   * Is there a usable account session right now?
   *
   * Presence of a token is not enough. Patient calls have no expiry
   * interceptor (the app's only one covers the owner/partner/admin consoles),
   * so an expired JWT used to sit in localStorage forever: the header kept
   * saying "My consults", and the chat kept asking a signed-out visitor "Who is
   * this consultation for?" — a question that only makes sense for someone with
   * a profile to protect. Every gated call behind that state 401s.
   *
   * So the expiry is read off the token itself and a dead session is cleared on
   * the spot. The claims are NOT trusted for anything else — the server still
   * verifies the signature; this only decides what the UI offers.
   */
  get isLoggedIn(): boolean {
    const token = this.authToken;
    if (!token) return false;
    if (this.isExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  /** True only when the JWT says, in its own payload, that it has expired. */
  private isExpired(token: string): boolean {
    const exp = this.tokenExpiry(token);
    // No `exp` claim, or a token we cannot parse: leave it alone. A malformed
    // token is the server's call to reject, and logging the user out on a
    // parsing quirk would be the worse failure of the two.
    return exp !== null && exp * 1000 <= Date.now();
  }

  /** `exp` (seconds since epoch) out of a JWT payload, or null. */
  private tokenExpiry(token: string): number | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4))
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const exp = JSON.parse(json)?.exp;
      return typeof exp === 'number' ? exp : null;
    } catch {
      return null;
    }
  }

  // Consent to upload a medical document for explanation. Asked once per
  // device, then remembered — unlike the per-chat consent above, which is
  // deliberately re-asked on every new consult. Survives reset(): it is a
  // standing permission about this account's files, not chat state.
  get docConsent(): boolean { return storage.get(LS_DOC_CONSENT) === '1'; }
  set docConsent(v: boolean) { storage.set(LS_DOC_CONSENT, v ? '1' : '0'); }

  /**
   * The document allowance, shared by the two surfaces that spend it: the
   * /report-reader page and the in-chat paperclip. They used to track it
   * separately — the reader had its own signal and the chat only learned the
   * number from an upload RESPONSE — so a chat upload left the reader showing
   * a stale count, and the chat had no idea of the allowance until it had
   * already spent one of it.
   *
   * In memory only, and never the authority. It is what the server last told
   * us, kept so the UI can stop a request it already knows will be refused.
   * The server decides; this only stops us wasting the user's time asking.
   */
  documentQuota: DocumentQuota | null = null;

  logout(): void {
    this.documentQuota = null;
    this.authToken = null;
    this.userId = null;
    this.userName = null;
    this.userMobile = null;
  }

  addMessage(m: ChatMessage): void { this.messages.push(m); }
  setMessages(msgs: ChatMessage[]): void { this.messages = msgs; }

  reset(): void {
    this.messages = [];
    this.report = null;
    this.location = null;
    this.suggestedSpecialty = null;
    this.suggestedSpecialties = [];
    this.selectedSpecialty = null;
    this.sessionId = null;
    storage.remove(LS_LEAD);
    storage.remove(LS_FEEDBACK);
    storage.remove(LS_CONSENT); // re-ask consent on each new chat
    storage.remove(LS_REPORT_TRACKED); // count the next report again
  }
}
