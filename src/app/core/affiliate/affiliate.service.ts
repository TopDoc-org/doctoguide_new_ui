import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { isBrowserPlatform, storage } from '../platform/platform';

const LS_REF = 'aiDoctorRef';
const LS_SESSION = 'aiDoctorSessionId';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredRef {
  clinicId: string;
  utm?: Record<string, string>;
  ts: number; // capture time (epoch ms)
}

// Campaign attribution. A partner clinic drives ad traffic to
// `/triage?ref=<clinicId>` (optionally with utm_* params). We capture the ref
// on landing, persist it (with a TTL) so it survives internal navigation and
// reloads, and record one click per page-load that actually carries a ref.
// The stored clinicId is later attached to the session, the captured lead, and
// the doctor search so the backend can attribute conversions to the clinic.
@Injectable({ providedIn: 'root' })
export class AffiliateService {
  private http = inject(HttpClient);
  private readonly isBrowser = isBrowserPlatform();
  private partnerBase = `${environment.serverUrl}${environment.partnerBase}`;
  // Guard so multiple NavigationEnd events in one page-load don't double-count.
  private recordedThisLoad = false;

  // Parse `ref` (+ utm_*) from a query string and, if present, persist it and
  // record a click. Safe to call on every NavigationEnd — only a URL that
  // actually carries `ref` triggers storage/click recording.
  // No-op during prerender: `window` doesn't exist on the server, and
  // attribution only makes sense for a real visitor.
  capture(search?: string): void {
    if (!this.isBrowser) return;
    const params = new URLSearchParams(search ?? window.location.search ?? '');
    const ref = (params.get('ref') || '').trim();
    if (!ref) return;

    const utm: Record<string, string> = {};
    params.forEach((v, k) => {
      if (k.toLowerCase().startsWith('utm_')) utm[k] = v;
    });

    const stored: StoredRef = { clinicId: ref, utm, ts: Date.now() };
    storage.set(LS_REF, JSON.stringify(stored));

    if (!this.recordedThisLoad) {
      this.recordedThisLoad = true;
      this.recordClick(ref, utm);
    }
  }

  // Active clinicId if a non-expired ref is stored, else null.
  get clinicId(): string | null {
    return this.readStored()?.clinicId ?? null;
  }

  get utm(): Record<string, string> | undefined {
    return this.readStored()?.utm;
  }

  // The digital-campaign tag (utm_campaign) from the stored ref link, if any.
  // Lets the funnel attribute each lead to the campaign that produced it.
  get campaign(): string | null {
    return this.utm?.['utm_campaign'] || null;
  }

  private readStored(): StoredRef | null {
    if (!this.isBrowser) return null;
    try {
      const raw = storage.get(LS_REF);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredRef;
      if (!parsed?.clinicId || Date.now() - (parsed.ts || 0) > TTL_MS) {
        storage.remove(LS_REF);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  // Fire-and-forget. A failed click record must never block the funnel.
  private recordClick(clinicId: string, utm?: Record<string, string>): void {
    this.http
      .post(`${this.partnerBase}/click`, {
        clinicId,
        sessionId: storage.get(LS_SESSION) || undefined,
        utm: utm && Object.keys(utm).length ? utm : undefined,
      })
      .subscribe({ next: () => {}, error: () => {} });
  }
}
