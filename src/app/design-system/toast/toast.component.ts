import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export type ToastTone = 'neutral' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  /** Optional single action — "Undo", "Retry", "View". */
  action?: { label: string; run: () => void };
}

const TONE_ICON: Record<ToastTone, string> = {
  neutral: 'info',
  success: 'check-circle',
  error: 'ban',
  warning: 'siren',
};

const TONE_CLASS: Record<ToastTone, string> = {
  neutral: 'text-content',
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
};

/**
 * One toast. Rendered by `ToastHostComponent`; not used directly.
 *
 * `role="status"` and not `role="alert"`: alert interrupts a screen reader
 * mid-sentence, which is right for "your session expired" and wrong for
 * "report downloaded". The announcement itself goes through CDK's LiveAnnouncer
 * in the service, which is what actually gets it read — a `role` on an element
 * that animates in is unreliable.
 */
@Component({
  selector: 'ds-toast',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="status"
      class="pointer-events-auto flex items-center gap-3 w-full sm:w-auto sm:min-w-[18rem] sm:max-w-[26rem]
             rounded-xl glass-3 shadow-e3 px-4 py-3 animate-slide-up">
      <ds-icon [name]="icon()" [size]="18" [class]="toneClass()" class="shrink-0" />

      <p class="min-w-0 flex-1 text-sm text-content">{{ toast().message }}</p>

      @if (toast().action; as action) {
        <button
          type="button"
          (click)="action.run(); dismissed.emit()"
          class="shrink-0 min-h-[44px] -my-2 px-2 rounded-lg text-sm font-semibold text-brand-ink
                 hover:bg-teal-500/10 transition-colors duration-fast focus-visible:focus-ring">
          {{ action.label }}
        </button>
      }

      <button
        type="button"
        (click)="dismissed.emit()"
        aria-label="Dismiss"
        class="grid shrink-0 place-items-center w-9 h-9 -mr-1.5 rounded-lg text-muted
               hover:text-content hover:bg-surface-2/70 transition-colors duration-fast">
        <ds-icon name="close" [size]="16" />
      </button>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class ToastComponent {
  readonly toast = input.required<Toast>();
  readonly dismissed = output<void>();

  protected icon(): string { return TONE_ICON[this.toast().tone]; }
  protected toneClass(): string { return TONE_CLASS[this.toast().tone]; }
}
