import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'ds-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center text-center px-4 py-10 sm:py-14 animate-fade-up-sm">
      @if (icon()) {
        <span class="grid place-items-center w-12 h-12 rounded-full bg-surface-2 text-muted mb-3">
          <ds-icon [name]="icon()!" [size]="24" />
        </span>
      }
      <h3 class="text-base sm:text-lg font-semibold text-content-strong">{{ title() }}</h3>
      @if (message()) {
        <p class="mt-1 text-sm text-muted max-w-sm">{{ message() }}</p>
      }
      <div class="mt-4"><ng-content /></div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class EmptyStateComponent {
  icon = input<string | null>(null);
  title = input.required<string>();
  message = input<string | null>(null);
}
