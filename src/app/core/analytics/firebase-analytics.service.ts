import { inject, Injectable } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Analytics, getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { environment } from '../../../environments/environment';
import { isBrowserPlatform } from '../platform/platform';

/**
 * Firebase Analytics wrapper. Browser-only — `isSupported()` also rules out
 * SSR and browsers without IndexedDB (Firebase Analytics' requirement), so
 * `analytics` stays undefined during server rendering.
 *
 * NOTE for the Android build: this is the WEB Firebase SDK running inside the
 * Capacitor WebView, which is what v1 did and what parity requires. The
 * consequence is that events are attributed to the GA4 *web* stream, not an
 * Android app stream. Switching to @capacitor-firebase/analytics would change
 * that attribution and is therefore a deliberate post-parity decision.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseAnalyticsService {
  private readonly isBrowser = isBrowserPlatform();
  private app?: FirebaseApp;
  private analytics?: Analytics;

  async init(): Promise<void> {
    if (this.app || !this.isBrowser) return;
    if (!(await isSupported())) return;
    this.app = initializeApp(environment.firebaseConfig);
    this.analytics = getAnalytics(this.app);
  }

  /** Send a custom Firebase Analytics event, e.g. logAnalyticsEvent('consult_started'). */
  logAnalyticsEvent(name: string, params?: Record<string, unknown>): void {
    if (this.analytics) {
      logEvent(this.analytics, name, params);
    }
  }
}
