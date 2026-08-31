import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Tones are DoctoGuide's palette. DocTribe's `blue` and `coral` are dropped —
// those colours do not exist here — and `grass` (the console green) is added.
export type BadgeTone = 'teal' | 'grass' | 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Ported from DocTribe with the alpha values rewritten from `/12` to `/[12%]`.
 *
 * This is not a style preference: Tailwind 3 only honours opacity modifiers
 * that exist in `theme.opacity` (0,5,10,20,25,...). `bg-teal-500/12` emits NO
 * rule at all, so DocTribe's badges render with no background today. `/[12%]`
 * is the arbitrary-value form and does emit.
 */
@Component({
  selector: 'ds-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="classes()"><ng-content /></span>`,
})
export class BadgeComponent {
  tone = input<BadgeTone>('neutral');
  solid = input(false);

  protected classes = computed(() => {
    const soft: Record<BadgeTone, string> = {
      teal: 'bg-teal-500/[12%] text-teal-700',
      grass: 'bg-grass-500/[12%] text-grass-700',
      success: 'bg-success/[12%] text-success',
      warning: 'bg-warning/[12%] text-warning',
      danger: 'bg-danger/[12%] text-danger',
      neutral: 'bg-surface-2 text-muted',
    };
    const strong: Record<BadgeTone, string> = {
      teal: 'bg-teal-600 text-white',
      grass: 'bg-grass-600 text-white',
      success: 'bg-success text-white',
      warning: 'bg-warning text-white',
      danger: 'bg-danger text-white',
      neutral: 'bg-content text-bg',
    };
    const base = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium';
    return `${base} ${(this.solid() ? strong : soft)[this.tone()]}`;
  });
}
