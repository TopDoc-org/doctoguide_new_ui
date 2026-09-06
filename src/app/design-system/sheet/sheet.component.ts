import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { OverlayPanelDirective } from '../overlay/overlay-panel.directive';

let uid = 0;

export type SheetSide = 'bottom' | 'right' | 'left';

/**
 * A modal panel for CONTENT — lists, filters, browsing, anything you scroll.
 * See `ds-dialog`'s header comment for why the two are separate components.
 *
 * Mobile-first by construction: the sheet comes up from the BOTTOM on a phone
 * whatever `side` says, and only takes its configured edge from `md:` up. That
 * is not a fallback, it is the point — the bottom of the screen is the only
 * part of a phone a thumb reaches comfortably, so a panel that arrives there
 * can be read, scrolled and dismissed one-handed. A right-hand drawer on a
 * phone puts its close button in the far corner.
 *
 *   side="bottom"  bottom sheet everywhere. Filters, pickers, short menus.
 *   side="right"   bottom on mobile, right-hand panel from `md:`. Detail and
 *                  inspector panels — the desktop "second column".
 *   side="left"    bottom on mobile, left-hand panel from `md:`. Navigation.
 *
 * The grab handle on mobile is not decorative: it is the affordance that says
 * "this dismisses downward", and it is what a user reaches for before they
 * look for a close button.
 */
@Component({
  selector: 'ds-sheet',
  standalone: true,
  imports: [IconComponent, OverlayPanelDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div [class]="wrapperClass()">
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          (click)="requestClose()"></div>

        <div
          #panel
          dsOverlayPanel
          (dismiss)="requestClose()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="heading() ? id + '-title' : null"
          [attr.aria-label]="heading() ? null : ariaLabel()"
          [class]="panelClass()"
          [style.transform]="dragY() ? 'translateY(' + dragY() + 'px)' : null"
          [style.transition]="dragging() ? 'none' : 'transform var(--dur-base) cubic-bezier(.2,0,0,1)'">
          <!-- Drag zone: the handle and the header. NOT the body — dragging
               from the body would fight its scroll, and a sheet you cannot
               scroll is worse than one you cannot flick away.

               touch-action: none here is required, not cosmetic: without it
               the browser claims the vertical gesture for scrolling and no
               pointermove ever reaches us. -->
          <div
            class="shrink-0 touch-none"
            (pointerdown)="onDragStart($event)"
            (pointermove)="onDragMove($event)"
            (pointerup)="onDragEnd()"
            (pointercancel)="onDragEnd()">
            <!-- Grab handle. Mobile only — from md: a side panel is not
                 draggable and a handle would be advertising an interaction that
                 does not exist. Decorative, so hidden from AT; the close button
                 is the accessible dismiss. -->
            <div class="md:hidden pt-3 pb-1" aria-hidden="true">
              <div class="mx-auto h-1.5 w-10 rounded-full bg-content/15"></div>
            </div>

            <div class="flex items-center justify-between gap-2 px-4 sm:px-5 h-14
                        border-b border-line/10">
              @if (heading()) {
                <h2 [id]="id + '-title'"
                    class="truncate font-heading text-base font-semibold text-content-strong">
                  {{ heading() }}
                </h2>
              } @else {
                <span></span>
              }
              <button
                type="button"
                (click)="requestClose()"
                aria-label="Close panel"
                class="grid place-items-center w-11 h-11 -mr-2 shrink-0 rounded-lg
                       text-muted hover:text-content hover:bg-surface-2/70 transition-colors duration-fast">
                <ds-icon name="close" [size]="20" />
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4">
            <ng-content />
          </div>

          <div class="shrink-0 border-t border-line/10 px-4 sm:px-5 py-3 empty:hidden">
            <ng-content select="[footer]" />
          </div>
        </div>
      </div>
    }
  `,
})
export class SheetComponent {
  protected readonly id = `ds-sheet-${++uid}`;

  readonly open = model(false);
  readonly heading = input('');
  readonly ariaLabel = input('Panel');
  readonly side = input<SheetSide>('bottom');
  readonly closed = output<void>();

  /** Where the panel sits inside the fixed wrapper. Mobile is always the bottom. */
  protected readonly wrapperClass = computed(() => {
    const base = 'fixed inset-0 z-overlay flex';
    const align: Record<SheetSide, string> = {
      bottom: 'items-end justify-center',
      right: 'items-end justify-center md:items-stretch md:justify-end',
      left: 'items-end justify-center md:items-stretch md:justify-start',
    };
    return `${base} ${align[this.side()]}`;
  });

  protected readonly panelClass = computed(() => {
    // Mobile: a bottom sheet capped below full height, so the page behind stays
    // visible. That strip of visible page is what tells the user the sheet is a
    // layer they can get out of rather than a screen they navigated to.
    //
    // `pb-safe-b` lives on the PANEL, not on the body and the footer, so a
    // sheet that has both does not pay the home-indicator inset twice.
    const base =
      'relative flex flex-col w-full max-h-[85dvh] pb-safe-b ' +
      'rounded-t-2xl glass-3 shadow-e3 ' +
      'md:max-h-none md:h-full md:w-[26rem] md:max-w-[85vw]';

    const desktop: Record<SheetSide, string> = {
      // Stays a bottom sheet at every width; just gets a sane measure.
      bottom: 'md:h-auto md:max-h-[85dvh] md:w-[32rem] md:mb-6 md:rounded-2xl',
      right: 'md:rounded-none md:rounded-l-2xl md:animate-slide-in-right',
      left: 'md:rounded-none md:rounded-r-2xl md:animate-slide-in-left',
    };

    // The entrance animation is DROPPED while dragging. A CSS animation with
    // `fill-mode: both` keeps applying its last keyframe (`transform: none`)
    // forever, and an animation's declarations outrank an inline style — so
    // leaving the class on means `[style.transform]` is silently ignored and
    // the sheet does not move under the finger. By the time anyone can drag,
    // the entrance has finished, so removing it is invisible.
    const entrance = this.dragging() ? '' : 'animate-slide-up';

    return `${base} ${desktop[this.side()]} ${entrance}`;
  });

  // ---- drag to dismiss ------------------------------------------------------
  //
  // Pointer events, not touch events: one code path covers finger, pen and (on
  // a desktop bottom sheet) mouse, and pointer capture keeps the gesture alive
  // when the finger leaves the drag zone — which it does almost immediately,
  // because dragging down is exactly the motion that takes it off the header.

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly dragY = signal(0);
  protected readonly dragging = signal(false);
  private startY = 0;

  protected onDragStart(event: PointerEvent): void {
    // Only the bottom presentation is draggable. `side="right"` is still a
    // bottom sheet on mobile, so ask the LAYOUT, not the input: below `md`
    // every side is bottom, and at `md` and up only `bottom` still is.
    const isBottomLayout =
      this.side() === 'bottom' ||
      (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches);
    if (!isBottomLayout) return;

    this.startY = event.clientY;
    this.dragging.set(true);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  protected onDragMove(event: PointerEvent): void {
    if (!this.dragging()) return;
    // Downward only. Rubber-banding upward would imply the sheet expands to
    // full height, and this one does not.
    this.dragY.set(Math.max(0, event.clientY - this.startY));
  }

  protected onDragEnd(): void {
    if (!this.dragging()) return;

    // Proportional, with a floor: a quarter of a tall sheet is a long way to
    // drag, and 96px on a short one is about the shortest flick that reads as
    // deliberate rather than a mis-tap.
    const height = this.panel()?.nativeElement.offsetHeight ?? 0;
    const pastThreshold = this.dragY() > Math.max(96, height * 0.25);

    // Clear the drag state BEFORE closing, so the panel is not mid-transform
    // when it unmounts and does not flash back at full height on reopen.
    this.dragging.set(false);
    this.dragY.set(0);

    if (pastThreshold) this.requestClose();
  }

  protected requestClose(): void {
    this.open.set(false);
    this.closed.emit();
  }
}
