import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ds-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 sm:mb-7">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          @if (eyebrow()) {
            <p class="text-xs font-semibold uppercase tracking-tighter text-teal-600">{{ eyebrow() }}</p>
          }
          <h1 class="mt-1 text-2xl sm:text-3xl font-semibold text-content-strong">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="mt-1.5 text-sm text-muted max-w-2xl">{{ subtitle() }}</p>
          }
        </div>
        <div class="shrink-0"><ng-content /></div>
      </div>
    </header>
  `,
  styles: [`:host { display: block; }`],
})
export class PageHeaderComponent {
  eyebrow = input<string | null>(null);
  title = input.required<string>();
  subtitle = input<string | null>(null);
}
