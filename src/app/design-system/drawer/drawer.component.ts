import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Replaces Angular Material's `mat-sidenav` (1 usage: the triage account menu).
 *
 * Lifted from DocTribe's ShellComponent drawer block, which already solves
 * everything Material was doing here: overlay backdrop, slide-in panel, body
 * scroll lock, focus move on open, and Escape to close. The
 * `mat-sidenav-container` / `mat-sidenav-content` wrapper disappears entirely —
 * it only existed to give Material a layout context.
 *
 * `open` is a model() so `[(open)]` replaces Material's `[(opened)]`
 * one-for-one at the call site.
 *
 * Mobile-first: full-height sheet pinned to the side, capped at 80vw so the
 * backdrop stays tappable to dismiss on a phone — the standard escape hatch.
 */
@Component({
  selector: 'ds-drawer',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50" role="dialog" aria-modal="true" [attr.aria-label]="ariaLabel()">
        <!-- Backdrop. Tapping it closes: on a phone this is the primary dismiss. -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-up-sm"
             (click)="open.set(false)"></div>

        <aside
          class="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col
                 bg-surface border-r border-line/10 shadow-e3
                 animate-scale-in origin-left"
          style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);">
          <div class="flex items-center justify-between gap-2 px-4 h-14 border-b border-line/10">
            <span class="truncate font-semibold text-content-strong">{{ heading() }}</span>
            <button #closeBtn type="button" (click)="open.set(false)" aria-label="Close menu"
                    class="grid place-items-center w-11 h-11 -mr-2 rounded-lg text-muted hover:text-content hover:bg-surface-2">
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

  private closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const btn = this.closeBtn();
      if (typeof document === 'undefined') return;
      // Scroll-lock the page behind the sheet. Without this, scrolling inside
      // the drawer chains to the body on iOS and the page drifts underneath.
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen && btn) btn.nativeElement.focus();
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.open.set(false);
  }
}
