import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** SSR/prerender-safe browser check. Injection-context only. */
export function isBrowserPlatform(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}

/**
 * Safe localStorage wrapper. No-ops during prerender, and swallows the throw
 * that Safari private mode / disabled-storage raises on access.
 *
 * The v1 app read localStorage unguarded in four services and got away with it
 * only because those routes were excluded from prerendering. Everything goes
 * through here now, so the question cannot come back.
 */
export const storage = {
  get(key: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      /* private mode / quota — ignore */
    }
  },
  remove(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
