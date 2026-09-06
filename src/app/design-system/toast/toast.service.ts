import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
  signal,
} from '@angular/core';
import { Toast, ToastComponent, ToastTone } from './toast.component';

/** The stack container. One instance, created lazily by ToastService. */
@Component({
  selector: 'ds-toast-host',
  standalone: true,
  imports: [ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Bottom-centre on mobile, bottom-right from 'sm:'. Bottom on mobile
         because that is where the thumb and the eye already are after tapping
         something; a top toast on a phone lands next to the notch and under
         nothing the user was looking at.

         'pointer-events-none' on the stack with 'pointer-events-auto' on each
         toast: the empty column between toasts must not swallow taps on the
         page behind, and on a phone that column is the full screen width. -->
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2
             px-4 pb-[calc(1rem+var(--safe-bottom))] sm:inset-x-auto sm:right-4 sm:items-end">
      @for (toast of toasts(); track toast.id) {
        <ds-toast [toast]="toast" (dismissed)="dismiss(toast.id)" />
      }
    </div>
  `,
})
export class ToastHostComponent {
  readonly toasts = signal<Toast[]>([]);
  dismiss: (id: number) => void = () => {};
}

export interface ToastOptions {
  tone?: ToastTone;
  /** ms. 0 keeps it until dismissed — use for an error the user must see. */
  duration?: number;
  action?: { label: string; run: () => void };
}

/**
 * Transient feedback.
 *
 *   private toast = inject(ToastService);
 *   this.toast.success('Report downloaded');
 *   this.toast.error('Could not reach the server', { action: { label: 'Retry', run: … } });
 *
 * WHY THIS EXISTS. Ported screens signal outcomes by mutating a field that some
 * corner of the template renders — `saved = true`, a "Saved" chip that fades,
 * an inline error paragraph. Every one of those is invisible if the user is
 * looking somewhere else on the page, and several are invisible full stop on a
 * phone because the element is above the fold they scrolled past.
 *
 * Errors DEFAULT TO STICKY (duration 0). An error the user did not read is an
 * error they will hit again, and a 4-second window is not consent.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly overlay = inject(Overlay);
  private readonly announcer = inject(LiveAnnouncer);

  private ref: OverlayRef | null = null;
  private host: ToastHostComponent | null = null;
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, options: ToastOptions = {}): number {
    const tone = options.tone ?? 'neutral';
    const duration = options.duration ?? (tone === 'error' ? 0 : 4000);
    const id = this.nextId++;

    this.ensureHost();
    this.host!.toasts.update((list) => {
      const next = [...list, { id, message, tone, action: options.action }];
      // Cap the stack. Beyond three, the newest toast is pushed off-screen on a
      // phone by the older ones it supersedes.
      return next.slice(-3);
    });

    // 'assertive' for errors so they interrupt; 'polite' otherwise so a
    // success message waits for the current utterance to finish.
    this.announcer.announce(message, tone === 'error' ? 'assertive' : 'polite');

    if (duration > 0) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
    }
    return id;
  }

  success(message: string, options: Omit<ToastOptions, 'tone'> = {}): number {
    return this.show(message, { ...options, tone: 'success' });
  }

  error(message: string, options: Omit<ToastOptions, 'tone'> = {}): number {
    return this.show(message, { ...options, tone: 'error' });
  }

  warning(message: string, options: Omit<ToastOptions, 'tone'> = {}): number {
    return this.show(message, { ...options, tone: 'warning' });
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }

    this.host?.toasts.update((list) => list.filter((t) => t.id !== id));

    // Tear the overlay down when the last one goes, rather than leaving an
    // empty fixed container in the DOM for the rest of the session.
    if (this.host && this.host.toasts().length === 0) this.teardown();
  }

  /**
   * Created on first use, not at construction: this service is `providedIn:
   * 'root'`, so constructing an overlay eagerly would touch `document` during
   * the prerender of all 22 static routes.
   */
  private ensureHost(): void {
    if (this.host) return;

    this.ref = this.overlay.create({
      // Positioning is entirely in the host component's own classes, so it can
      // be responsive. A CDK position strategy would pin it in JS and need a
      // resize listener to do the same thing worse.
      positionStrategy: this.overlay.position().global(),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      hasBackdrop: false,
    });

    this.host = this.ref.attach(new ComponentPortal(ToastHostComponent)).instance;
    this.host.dismiss = (id) => this.dismiss(id);
  }

  private teardown(): void {
    this.ref?.dispose();
    this.ref = null;
    this.host = null;
  }
}
