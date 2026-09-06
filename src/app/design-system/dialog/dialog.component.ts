import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { OverlayPanelDirective } from '../overlay/overlay-panel.directive';

let uid = 0;

/**
 * A modal dialog. Centred at every width.
 *
 * ds-dialog vs ds-sheet — the split is by CONTENT, not by screen size:
 *
 *   ds-dialog  a question. Confirms, short forms, anything the user answers and
 *              dismisses. Centred everywhere, including mobile, because a
 *              question wants to sit in the middle of your attention.
 *   ds-sheet   content. Lists, panels, filters, anything you scroll or browse.
 *              Bottom sheet on mobile, side panel from `md:`.
 *
 * Both are modal and both use the same `dsOverlayPanel` core (focus trap,
 * scroll lock, Escape-if-topmost). Having two components rather than one with a
 * `variant` input is deliberate: the call site should have to decide which of
 * those two things it is, and the answer is never "whichever fits".
 *
 * Content goes in three optional slots, shadcn-style:
 *
 *   <ds-dialog [(open)]="confirm" heading="Leave this consult?"
 *              description="Your messages are saved to your history.">
 *     <p>…body…</p>
 *     <ng-container footer>
 *       <ds-button variant="ghost" (pressed)="confirm.set(false)">Stay</ds-button>
 *       <ds-button variant="danger" (pressed)="leave()">Leave</ds-button>
 *     </ng-container>
 *   </ds-dialog>
 */
@Component({
  selector: 'ds-dialog',
  standalone: true,
  imports: [IconComponent, OverlayPanelDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-overlay grid place-items-center p-4">
        <!-- Backdrop. Tapping it closes unless the dialog is asking something
             it must not lose the answer to ([dismissible]="false"). -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          (click)="backdropClose()"></div>

        <div
          dsOverlayPanel
          (dismiss)="requestClose()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="heading() ? id + '-title' : null"
          [attr.aria-label]="heading() ? null : ariaLabel()"
          [attr.aria-describedby]="description() ? id + '-desc' : null"
          [class]="panelClass()">
          @if (dismissible()) {
            <button
              type="button"
              (click)="requestClose()"
              aria-label="Close dialog"
              class="absolute right-3 top-3 grid place-items-center w-11 h-11 rounded-lg
                     text-muted hover:text-content hover:bg-surface-2/70 transition-colors duration-fast">
              <ds-icon name="close" [size]="20" />
            </button>
          }

          @if (heading()) {
            <h2 [id]="id + '-title'"
                class="font-heading text-lg font-semibold text-content-strong pr-10">
              {{ heading() }}
            </h2>
          }
          @if (description()) {
            <p [id]="id + '-desc'" class="mt-1.5 text-sm text-muted">{{ description() }}</p>
          }

          <div [class.mt-4]="heading() || description()">
            <ng-content />
          </div>

          <!-- Footer actions stack full-width on mobile and sit right-aligned
               from 'sm:'. Reversed on mobile so the primary action is the one
               under the thumb, which is the bottom row on a phone.

               'empty:hidden' collapses the row when nothing is projected. It
               relies on Angular stripping whitespace-only text nodes (the
               default 'preserveWhitespaces: false') — with them preserved this
               div is never ':empty' and an 8px gap appears under every dialog
               that has no footer. -->
          <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 empty:hidden">
            <ng-content select="[footer]" />
          </div>
        </div>
      </div>
    }
  `,
})
export class DialogComponent {
  protected readonly id = `ds-dialog-${++uid}`;

  readonly open = model(false);
  readonly heading = input('');
  readonly description = input('');
  /** Only used when there is no visible heading to point `aria-labelledby` at. */
  readonly ariaLabel = input('Dialog');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** false = no close button, backdrop taps ignored, Escape ignored. */
  readonly dismissible = input(true);

  /** Fires on every close the USER asked for. Not on a programmatic `open.set(false)`. */
  readonly closed = output<void>();

  // One computed string rather than a static `class` plus a `[class]` binding.
  // Angular does merge those two, but the merge is invisible at the call site
  // and `ds-button` already established the single-computed pattern here.
  protected readonly panelClass = computed(() => {
    const base =
      'relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain ' +
      'rounded-2xl glass-3 shadow-e3 animate-scale-in p-5 sm:p-6';
    const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[this.size()];
    return `${base} ${width}`;
  });

  protected requestClose(): void {
    if (!this.dismissible()) return;
    this.open.set(false);
    this.closed.emit();
  }

  protected backdropClose(): void {
    this.requestClose();
  }
}
