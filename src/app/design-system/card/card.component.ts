import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Ported from DocTribe. Padding is mobile-first: the unprefixed value is the
 *  phone value, `sm:` opens it up on larger viewports. */
@Component({
  selector: 'ds-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div [class]="classes()"><ng-content /></div>`,
  styles: [`:host { display: block; }`],
})
export class CardComponent {
  glass = input(false);
  hover = input(false);
  padding = input<'none' | 'sm' | 'md' | 'lg'>('md');

  protected classes = computed(() => {
    const pad = { none: '', sm: 'p-3 sm:p-4', md: 'p-4 sm:p-6', lg: 'p-5 sm:p-8' }[this.padding()];
    const base = this.glass() ? 'glass' : 'bg-surface border border-line/10 shadow-e1';
    const hov = this.hover()
      ? 'transition-all duration-200 ease-standard hover:shadow-e3 hover:-translate-y-0.5'
      : '';
    return ['rounded-lg', base, pad, hov].filter(Boolean).join(' ');
  });
}
