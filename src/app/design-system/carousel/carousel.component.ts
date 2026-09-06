import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  input,
  signal,
} from '@angular/core';

export interface CarouselSlide {
  title: string;
  text: string;
}

/**
 * Replaces PrimeNG's `p-carousel` (1 usage: the text-only rotating hero on the
 * landing page). v1 configured it `numVisible=1`, `numScroll=1`, `circular`,
 * no navigators, indicators on.
 *
 * THE AUTOPLAY GUARD IS LOAD-BEARING. v1 passed
 * `[autoplayInterval]="isBrowser ? 6500 : 0"`, and the timer here is started
 * only when `interval() > 0` for exactly the same reason: the Angular 19
 * prerenderer blocks on application stability, so a repeating timer started
 * during prerender never lets `/` finish building — it hangs with no useful
 * error. Do not "simplify" this to an unconditional setInterval.
 *
 * Also pauses under prefers-reduced-motion, and while the tab is hidden.
 */
@Component({
  selector: 'ds-carousel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" role="region" [attr.aria-label]="ariaLabel()">
      <!--
        EVERY slide stays in the DOM and is moved with a transform, rather than
        rendering only the active one. That is deliberate and matches what
        PrimeNG's p-carousel did in v1: all slide copy is present in the
        prerendered HTML and therefore crawlable. Rendering just the active
        slide dropped ~900 characters of indexable text from the homepage.
      -->
      <div class="overflow-hidden">
        <div
          class="flex transition-transform duration-500 ease-standard motion-reduce:transition-none"
          [style.transform]="'translateX(' + (-100 * index()) + '%)'">
          @for (slide of slides(); track slide.title; let i = $index) {
            <div
              class="flex min-h-[5.5rem] w-full shrink-0 flex-col items-center justify-center gap-1.5 px-3 text-center"
              [attr.aria-hidden]="i === index() ? null : 'true'">
              <p class="font-heading text-lg font-bold text-ink sm:text-xl">{{ slide.title }}</p>
              <p class="font-body text-sm leading-relaxed text-content sm:text-base">{{ slide.text }}</p>
            </div>
          }
        </div>
      </div>

      @if (showIndicators() && slides().length > 1) {
        <div class="mt-1 flex items-center justify-center gap-0.5">
          @for (slide of slides(); track slide.title; let i = $index) {
            <button
              type="button"
              (click)="goTo(i)"
              [attr.aria-label]="'Go to slide ' + (i + 1)"
              [attr.aria-current]="i === index() ? 'true' : null"
              class="grid place-items-center w-11 h-11 rounded-full touch-manipulation">
              <span
                class="block h-1.5 rounded-full transition-all duration-200 ease-standard"
                [class]="i === index() ? 'w-5 bg-teal-600' : 'w-1.5 bg-teal-600/30'"></span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class CarouselComponent implements OnInit, OnDestroy {
  slides = input<CarouselSlide[]>([]);
  /** Milliseconds between advances. 0 (or less) disables autoplay entirely —
   *  which is what the caller passes during prerender. */
  interval = input(0);
  showIndicators = input(true);
  ariaLabel = input('Highlights');

  protected index = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  private reducedMotion = computed(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  ngOnInit(): void {
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  protected goTo(i: number): void {
    this.index.set(i);
    // Restart the clock so a manual pick gets a full dwell, not the remainder.
    this.stop();
    this.start();
  }

  private start(): void {
    const ms = this.interval();
    if (ms <= 0 || this.reducedMotion()) return;
    if (typeof window === 'undefined') return;
    this.timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const n = this.slides().length;
      if (n > 1) this.index.set((this.index() + 1) % n); // circular
    }, ms);
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
