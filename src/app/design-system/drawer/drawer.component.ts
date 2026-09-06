import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { OverlayPanelDirective } from '../overlay/overlay-panel.directive';

/**
 * Replaces Angular Material's `mat-sidenav` (1 usage: the triage account menu).
 *
 * Lifted from DocTribe's ShellComponent drawer block, which already solved most
 * of what Material was doing here: overlay backdrop, slide-in panel, body
 * scroll lock, focus move on open, and Escape to close.
 *
 * REBUILT on `dsOverlayPanel` during the redesign. What it had was focus MOVE —
 * `closeBtn.focus()` in an effect — which is not a focus TRAP: Tab from the
 * close button walked straight out into the page behind the drawer, and closing
 * left focus wherever it happened to be instead of on the hamburger that opened
 * it. The directive brings a real CDK trap with focus restore, plus refcounted
 * scroll locking and topmost-only Escape, which matters here specifically:
 * /triage opens the auth gate ON TOP of this drawer, and the old
 * `document:keydown.escape` listener closed both with one keypress.
 *
 * `open` is a model() so `[(open)]` replaces Material's `[(opened)]`
 * one-for-one at the call site. The public API is unchanged by the rebuild —
 * triage-shell binds `[(open)]`, `heading` and `ariaLabel` and needed no edit.
 *
 * Mobile-first: full-height sheet pinned to the side, capped at 80vw so the
 * backdrop stays tappable to dismiss on a phone — the standard escape hatch.
 */
@Component({
  selector: 'ds-drawer',
  standalone: true,
  imports: [IconComponent, OverlayPanelDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-overlay">
        <!-- Backdrop. Tapping it closes: on a phone this is the primary dismiss. -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
             (click)="open.set(false)"></div>

        <aside
          dsOverlayPanel
          (dismiss)="open.set(false)"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="ariaLabel()"
          class="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col
                 bg-surface border-r border-line/10 shadow-e3
                 animate-slide-in-left pt-safe-t pb-safe-b">
          <div class="flex items-center justify-between gap-2 px-4 h-14 border-b border-line/10">
            <span class="truncate font-semibold text-content-strong">{{ heading() }}</span>
            <button type="button" (click)="open.set(false)" aria-label="Close menu"
                    class="grid place-items-center w-11 h-11 -mr-2 rounded-lg text-muted
                           hover:text-content hover:bg-surface-2 transition-colors duration-fast">
              <ds-icon name="close" [size]="20" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto overscroll-contain">
            <ng-content />
          </div>
        </aside>
      </div>
    }
  `,
})
export class DrawerComponent {
  open = model(false);
  heading = input('');
  ariaLabel = input('Menu');
}
