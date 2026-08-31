import { Injectable, NgZone, inject } from '@angular/core';
import { Location } from '@angular/common';
import { isBrowserPlatform } from '../platform/platform';

type OverlayCloser = () => boolean;

/**
 * Android hardware back button.
 *
 * This is the one piece of behaviour the APK needs that has NO web equivalent,
 * so it is an addition rather than a port. Without it Capacitor's default fires
 * and the app exits on the first back press — mid-consult, losing the user's
 * place. That is not a defensible shipping state for an APK.
 *
 * Precedence, highest first:
 *   1. close a registered overlay (drawer, dialog, history panel, …)
 *   2. step back in router history
 *   3. at the root, require a second press within 2s to exit
 *
 * Reads the plugin off the runtime global rather than importing @capacitor/app
 * statically, so the web bundle carries no native import and this file is inert
 * in a browser.
 */
@Injectable({ providedIn: 'root' })
export class BackButtonService {
  private zone = inject(NgZone);
  private location = inject(Location);
  private readonly isBrowser = isBrowserPlatform();

  private overlays: OverlayCloser[] = [];
  private lastPressAt = 0;
  private started = false;

  /**
   * Register a closer. Return true if it consumed the press (i.e. it was open
   * and is now closed). Closers run most-recently-registered first, so a dialog
   * opened on top of a drawer closes first.
   */
  registerOverlay(close: OverlayCloser): () => void {
    this.overlays.unshift(close);
    return () => {
      this.overlays = this.overlays.filter((c) => c !== close);
    };
  }

  start(): void {
    if (this.started || !this.isBrowser) return;

    const App = (globalThis as { Capacitor?: { Plugins?: { App?: unknown } } })
      .Capacitor?.Plugins?.App as
      | { addListener(e: string, cb: (d: { canGoBack: boolean }) => void): void; exitApp(): void }
      | undefined;
    if (!App) return; // plain browser — nothing to do

    this.started = true;
    App.addListener('backButton', () => {
      // The listener fires outside Angular's zone; without this the UI does not
      // update when an overlay is closed.
      this.zone.run(() => this.handle(App));
    });
  }

  private handle(App: { exitApp(): void }): void {
    for (const close of this.overlays) {
      if (close()) return;
    }

    if (this.canGoBack()) {
      this.location.back();
      return;
    }

    const now = Date.now();
    if (now - this.lastPressAt < 2000) {
      App.exitApp();
      return;
    }
    this.lastPressAt = now;
    this.toast('Press back again to exit');
  }

  private canGoBack(): boolean {
    // Location.back() is a no-op at the start of the session's history.
    return typeof history !== 'undefined' && history.length > 1;
  }

  /** Minimal, dependency-free toast. The app has no toast system of its own. */
  private toast(message: string): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('dg-back-toast');
    if (existing) return;
    const el = document.createElement('div');
    el.id = 'dg-back-toast';
    el.textContent = message;
    el.setAttribute('role', 'status');
    el.style.cssText = [
      'position:fixed', 'left:50%', 'transform:translateX(-50%)',
      'bottom:calc(24px + env(safe-area-inset-bottom))', 'z-index:2147483647',
      'background:rgba(10,51,47,.92)', 'color:#F0FDFA', 'font-size:14px',
      'padding:10px 16px', 'border-radius:9999px', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
}
