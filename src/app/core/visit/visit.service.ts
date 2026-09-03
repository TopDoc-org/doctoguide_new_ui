import { inject, Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isBrowserPlatform } from '../platform/platform';
import { AffiliateService } from '../affiliate/affiliate.service';

/**
 * Where the server placed this visitor, resolved from the request IP.
 * City-level, no permission prompt. The server keeps the visitor hash — only
 * the place comes back.
 */
export interface VisitorOrigin {
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  org: string | null;
  lat: number | null;
  lng: number | null;
  source: 'cdn-header' | 'ipinfo' | 'ipapi' | 'none';
}

// Landing-visit beacon. A session is only created once someone starts a chat,
// so without this every visitor who lands and bounces is recorded nowhere —
// which is most ad traffic, and exactly the traffic you need geography for.
//
// Fire-and-forget: the beacon never blocks rendering and a failure is swallowed.
// No-op during prerender — attribution only means something for a real visitor.
@Injectable({ providedIn: 'root' })
export class VisitService {
  /** Server-resolved origin for this visit; null until the beacon returns. */
  origin: VisitorOrigin | null = null;

  private http = inject(HttpClient);
  private affiliate = inject(AffiliateService);
  private readonly isBrowser = isBrowserPlatform();
  private base = `${environment.serverUrl}${environment.aiBase}`;
  // One beacon per app load. Guards against multiple components calling this
  // and against repeated NavigationEnd events, same as AffiliateService.
  private sent = false;

  async record(path?: string): Promise<void> {
    if (!this.isBrowser || this.sent) return;
    this.sent = true;
    try {
      const res = await firstValueFrom(
        this.http.post<{ origin: VisitorOrigin }>(`${this.base}/visit`, {
          path: path ?? window.location.pathname,
          clinicId: this.affiliate.clinicId || undefined,
          campaign: this.affiliate.campaign || undefined,
          utm: this.affiliate.utm || undefined,
        }),
      );
      this.origin = res?.origin ?? null;
      this.log();
    } catch {
      // Backend down / blocked -> the page carries on with no origin.
      if (isDevMode()) console.log('%c📍 visitor origin', 'color:#0b7', 'beacon failed');
    }
  }

  /** "Bengaluru, Karnataka, IN" — empty string until the beacon returns. */
  get place(): string {
    const o = this.origin;
    if (!o) return '';
    return [o.city, o.region, o.country].filter(Boolean).join(', ');
  }

  /**
   * Dev-only console trace, so the location the backend actually recorded is
   * visible in DevTools without opening Elasticsearch. isDevMode() keeps it out
   * of production — a visitor should not find their own city and ISP in their
   * console.
   */
  private log(): void {
    if (!isDevMode()) return;
    console.log(
      `%c📍 visitor origin%c ${this.place || 'unknown location'}`,
      'background:#0b7;color:#fff;padding:1px 5px;border-radius:3px',
      'color:inherit',
      this.origin,
    );
  }
}
