import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { isBrowserPlatform } from '../platform/platform';
import { SITE_URL } from '../config/site';

const SITE_HOST = new URL(SITE_URL).host;

/**
 * Map an opened URL to an in-app router path, or null if it is not ours.
 *
 * Exact host match, so doctoguide.knocdoc.in.example.com is rejected. The query
 * string is kept: /triage?ref=clinicId must still reach AffiliateService.
 */
export function toAppPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.host !== SITE_HOST) return null;
  return `${parsed.pathname || '/'}${parsed.search}${parsed.hash}`;
}

/**
 * Android App Links. The manifest intent-filter gets the app opened for a
 * https://doctoguide.knocdoc.in link; this puts the user on the page they tapped
 * instead of the home screen.
 *
 * Covers cold start too: BridgeActivity replays the launch intent through
 * onNewIntent, and the App plugin retains `appUrlOpen` until a listener attaches.
 *
 * Same runtime-global read as BackButtonService, so the web bundle carries no
 * native import and this is inert in a browser.
 */
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private zone = inject(NgZone);
  private router = inject(Router);
  private readonly isBrowser = isBrowserPlatform();

  private started = false;

  start(): void {
    if (this.started || !this.isBrowser) return;

    const App = (globalThis as { Capacitor?: { Plugins?: { App?: unknown } } })
      .Capacitor?.Plugins?.App as
      | { addListener(e: string, cb: (d: { url: string }) => void): void }
      | undefined;
    if (!App) return; // plain browser — nothing to do

    this.started = true;
    App.addListener('appUrlOpen', ({ url }) => {
      const path = toAppPath(url);
      if (!path) return;
      // Fires outside Angular's zone, like the backButton listener.
      this.zone.run(() => void this.router.navigateByUrl(path));
    });
  }
}
