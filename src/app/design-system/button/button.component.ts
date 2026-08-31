import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type BtnVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'glass';
export type BtnSize = 'sm' | 'md' | 'lg';

/**
 * Ported from DocTribe with two deliberate changes:
 *
 * 1. `primary` is `bg-teal-600 text-white`, not DocTribe's
 *    `bg-teal-500 text-slate-900`. Dark text on mid-teal reads wrong against
 *    DoctoGuide's cream canvas, and teal-600 (#0D9488) is the CTA colour v1
 *    already used everywhere.
 * 2. Sizes are MOBILE-FIRST. The unprefixed height is the touch size (>= 44px,
 *    the minimum comfortable tap target); `sm:` tightens it for pointer-driven
 *    viewports. DocTribe's `sm` variant was 36px at every width, which is below
 *    the touch minimum on a phone — where most of this app is used.
 */
@Component({
  selector: 'ds-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [class]="classes()"
      (click)="pressed.emit($event)">
      @if (loading()) {
        <span
          class="absolute inline-block w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin"
          role="status" aria-label="Loading"></span>
      }
      <span class="inline-flex items-center gap-2" [class.opacity-0]="loading()">
        <ng-content />
      </span>
    </button>
  `,
  styles: [`:host { display: inline-block; }`],
})
export class ButtonComponent {
  variant = input<BtnVariant>('primary');
  size = input<BtnSize>('md');
  type = input<'button' | 'submit'>('button');
  disabled = input(false);
  loading = input(false);
  block = input(false);
  pressed = output<MouseEvent>();

  protected classes = computed(() => {
    const base =
      'relative inline-flex items-center justify-center gap-2 font-semibold rounded-full ' +
      'transition-all duration-150 ease-standard select-none touch-manipulation ' +
      'focus-visible:focus-ring active:scale-[.97] ' +
      'disabled:opacity-45 disabled:pointer-events-none';

    const variants: Record<BtnVariant, string> = {
      primary: 'bg-teal-600 text-white shadow-e1 hover:bg-teal-700 hover:shadow-e2',
      accent: 'bg-accent text-white shadow-e1 hover:brightness-110 hover:shadow-e2',
      secondary: 'bg-surface text-content border border-line/[15%] hover:bg-surface-2',
      ghost: 'text-content hover:bg-surface-2/60',
      danger: 'bg-danger text-white shadow-e1 hover:brightness-110',
      glass: 'glass text-content hover:brightness-105',
    };

    // base = touch, sm: = pointer.
    const sizes: Record<BtnSize, string> = {
      sm: 'h-11 sm:h-9 px-4 sm:px-3.5 text-sm',
      md: 'h-12 sm:h-11 px-5 text-sm',
      lg: 'h-14 sm:h-12 px-6 text-base',
    };

    return [base, variants[this.variant()], sizes[this.size()], this.block() ? 'w-full' : '']
      .filter(Boolean)
      .join(' ');
  });
}
