import { Injectable, signal } from '@angular/core';
import { storage } from '../platform/platform';

type Theme = 'dark' | 'light';
const KEY = 'doctoguideTheme';

/**
 * Theme plumbing, ported from DocTribe so the token architecture is complete.
 *
 * IMPORTANT — no UI exposes this. v1 had no dark theme at all, so anything that
 * flips `data-theme` is a parity break by construction: every screen would
 * render against tokens no one has reviewed. `ds-theme-toggle` is deliberately
 * NOT ported, and `init()` pins light unless something already wrote the key.
 *
 * Keep it here anyway: the dark token block exists in styles.scss, and having
 * the switch wired but unused is what makes enabling dark mode later a UI
 * decision rather than a re-architecture.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('light');
  readonly isLight = signal(true);

  init(): void {
    const saved = storage.get(KEY);
    this.apply(saved === 'dark' ? 'dark' : 'light');
  }

  toggle(): void {
    this.apply(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.apply(theme);
  }

  private apply(theme: Theme): void {
    this.theme.set(theme);
    this.isLight.set(theme === 'light');
    storage.set(KEY, theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      // Light keeps v1's brand teal so the Android status bar / PWA chrome is
      // unchanged. Do not swap this to the page background colour.
      document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'light' ? '#0d9488' : '#061a18');
    }
  }
}
