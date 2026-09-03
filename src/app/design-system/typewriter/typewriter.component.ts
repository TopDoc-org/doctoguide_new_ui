import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * A line that types itself, cycling through a list of phrases.
 *
 * Used where a page has several things to say and only one line to say them in
 * — the landing hero, which previously stacked a pill row, a rotating card and
 * a feature card on top of each other to make the same points. One line that
 * moves reads as deliberate; four stacked boxes read as a list of ads.
 *
 * Three things this has to get right, all of them about people who are not
 * watching an animation:
 *
 * - **Prerender / no JS.** The first phrase is rendered in full as the initial
 *   state, so the static HTML says something complete. Typing only ever starts
 *   in the browser.
 * - **Crawlers and screen readers.** Every phrase is emitted in a visually
 *   hidden list. What the page means must not depend on catching frame 40 of an
 *   animation, and the animated span itself is aria-hidden so a screen reader
 *   is not read a half-typed word.
 * - **Reduced motion.** `prefers-reduced-motion: reduce` pins the first phrase
 *   and never animates.
 */
@Component({
  selector: 'ds-typewriter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-baseline">
      <span aria-hidden="true">{{ shown() }}</span>
      <!-- The caret. Sized off the text so it scales with whatever type the
           host applies, and pinned to the baseline so the line never jitters. -->
      <span
        aria-hidden="true"
        class="ml-0.5 inline-block w-[2px] self-center bg-current"
        [class.animate-caret]="!animating()"
        [style.height.em]="0.9"
      ></span>
    </span>
    <!-- The same content, for anything that does not watch pixels. -->
    <span class="sr-only">{{ phrases().join('. ') }}</span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      /* Blinks only while the text is at rest — a caret blinking mid-word
         reads as a rendering fault rather than a cursor. */
      @keyframes ds-caret {
        0%,
        45% {
          opacity: 1;
        }
        55%,
        100% {
          opacity: 0;
        }
      }
      .animate-caret {
        animation: ds-caret 1s steps(1, end) infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .animate-caret {
          animation: none;
        }
      }
    `,
  ],
})
export class TypewriterComponent implements OnInit {
  /** The lines to cycle. The first one is what a crawler and a no-JS visitor see. */
  phrases = input.required<string[]>();
  /** Milliseconds per character typed. */
  typeMs = input(45);
  /** Milliseconds per character erased — always quicker than typing. */
  eraseMs = input(22);
  /** How long a finished phrase sits before it is erased. */
  holdMs = input(1900);

  protected shown = signal('');
  /** True while characters are moving; the caret only blinks at rest. */
  protected animating = signal(false);

  private index = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    destroyRef: DestroyRef,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    destroyRef.onDestroy(() => this.clear());
  }

  ngOnInit(): void {
    const first = this.phrases()[0] || '';
    this.shown.set(first);
    if (!this.isBrowser || this.phrases().length < 2 || this.reducedMotion()) return;
    this.timer = setTimeout(() => this.erase(), this.holdMs());
  }

  private reducedMotion(): boolean {
    return (
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private type(): void {
    const full = this.phrases()[this.index] || '';
    const shown = this.shown();
    if (shown.length < full.length) {
      this.animating.set(true);
      this.shown.set(full.slice(0, shown.length + 1));
      this.timer = setTimeout(() => this.type(), this.typeMs());
      return;
    }
    this.animating.set(false);
    this.timer = setTimeout(() => this.erase(), this.holdMs());
  }

  private erase(): void {
    const shown = this.shown();
    if (shown.length > 0) {
      this.animating.set(true);
      this.shown.set(shown.slice(0, -1));
      this.timer = setTimeout(() => this.erase(), this.eraseMs());
      return;
    }
    this.index = (this.index + 1) % this.phrases().length;
    this.timer = setTimeout(() => this.type(), 220);
  }

  private clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
