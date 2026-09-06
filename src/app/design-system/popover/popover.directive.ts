import {
  ConnectedPosition,
  Overlay,
  OverlayRef,
  ScrollStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  Injector,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { OverlayStackService } from '../overlay/overlay-stack.service';

export type PopoverAlign = 'start' | 'center' | 'end';
export type PopoverSide = 'top' | 'bottom';

/**
 * Anchored, non-modal overlay. The positioning engine behind `ds-dropdown-menu`
 * and `ds-tooltip`, and usable directly for anything that hangs off a trigger.
 *
 *   <button [dsPopover]="menu" [(popoverOpen)]="open">Account</button>
 *   <ng-template #menu>…</ng-template>
 *
 * CDK's Overlay does the one part that is genuinely hard: keeping the panel
 * attached to a trigger that moves, and flipping it to the other side when it
 * would leave the viewport. The app's own overlays are hand-rolled because they
 * are full-screen and position is trivial; this one is not.
 *
 * NON-MODAL, deliberately, and that is the difference from `ds-dialog`:
 *  - no focus trap. A popover is part of the page, and trapping focus in one
 *    means Tab cannot leave it, which is wrong for a menu you may want to Tab
 *    past. `ds-dropdown-menu` layers roving arrow-key navigation on top, which
 *    is the correct keyboard model for a menu.
 *  - no scroll lock. It reposition-follows instead, and closes on a
 *    block-level scroll it cannot follow.
 *  - it still registers with `OverlayStackService`, so Escape order stays
 *    correct when a popover is open inside a dialog.
 *
 * SSR: nothing here runs until a user event opens it, and CDK creates its
 * container lazily, so the prerender never touches `document`.
 */
@Directive({
  selector: '[dsPopover]',
  standalone: true,
  exportAs: 'dsPopover',
})
export class PopoverDirective {
  /** The panel content. */
  readonly content = input.required<TemplateRef<unknown>>({ alias: 'dsPopover' });
  readonly popoverOpen = model(false);
  readonly side = input<PopoverSide>('bottom');
  readonly align = input<PopoverAlign>('start');
  /** Gap between trigger and panel, px. */
  readonly offset = input(8);
  /** Match the panel's width to the trigger's — right for a select-like menu. */
  readonly matchTriggerWidth = input(false);

  readonly opened = output<void>();
  readonly closed = output<void>();

  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly stack = inject(OverlayStackService);
  private readonly destroyRef = inject(DestroyRef);

  private overlayRef: OverlayRef | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.detach());

    // `[(popoverOpen)]` has to work in BOTH directions: the trigger toggles it,
    // and a call site can also drive it from its own state (close the menu when
    // a route changes, open it from a keyboard shortcut). This syncs the model
    // back onto the overlay.
    //
    // It cannot loop: open() and close() are no-ops once the overlay is already
    // in the requested state, and they are the only writers of the signal.
    effect(() => {
      const wanted = this.popoverOpen();
      if (wanted && !this.overlayRef) this.open();
      else if (!wanted && this.overlayRef) this.close();
    });
  }

  toggle(): void {
    this.popoverOpen() ? this.close() : this.open();
  }

  open(): void {
    if (this.overlayRef) return;

    const ref = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.host)
        .withPositions(this.positions())
        .withPush(false),
      scrollStrategy: this.scrollStrategy(),
      hasBackdrop: false,
      width: this.matchTriggerWidth() ? this.host.nativeElement.offsetWidth : undefined,
    });

    ref.attach(new TemplatePortal(this.content(), this.vcr, undefined, this.injector));
    this.overlayRef = ref;
    this.stack.push(this);
    this.popoverOpen.set(true);
    this.opened.emit();
  }

  close(): void {
    if (!this.overlayRef) return;
    this.detach();
    this.popoverOpen.set(false);
    this.closed.emit();
  }

  private detach(): void {
    this.stack.pop(this);
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }

  /**
   * `reposition` rather than `block`: blocking page scroll while a non-modal
   * panel is open freezes the page under a thing the user did not ask to be
   * modal. Reposition keeps the panel glued to its trigger, and
   * `autoClose` dismisses it once the trigger scrolls out of view — which is
   * what a user scrolling away is asking for anyway.
   */
  private scrollStrategy(): ScrollStrategy {
    return this.overlay.scrollStrategies.reposition({ autoClose: true });
  }

  /**
   * Preferred position first, then the vertical flip. CDK walks this list and
   * takes the first that fits, so the order IS the fallback policy.
   */
  private positions(): ConnectedPosition[] {
    const align = this.align();
    const x = { start: 'start', center: 'center', end: 'end' } as const;
    const originX = x[align];
    const overlayX = x[align];
    const gap = this.offset();

    const below: ConnectedPosition = {
      originX, originY: 'bottom', overlayX, overlayY: 'top', offsetY: gap,
    };
    const above: ConnectedPosition = {
      originX, originY: 'top', overlayX, overlayY: 'bottom', offsetY: -gap,
    };

    return this.side() === 'bottom' ? [below, above] : [above, below];
  }

  /** Escape closes, but only when this is the topmost overlay. */
  @HostListener('document:keydown.escape', ['$event'])
  protected onEscape(event: KeyboardEvent): void {
    if (!this.overlayRef || !this.stack.isTop(this)) return;
    event.stopPropagation();
    this.close();
  }

  /**
   * Click-away. Listening on `document` rather than rendering a transparent
   * full-screen catcher div (which is what the landing page's hand-rolled
   * account dropdown does today): the catcher swallows the first click
   * anywhere on the page, so dismissing the menu and pressing the button you
   * actually wanted takes two taps.
   */
  @HostListener('document:pointerdown', ['$event'])
  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!this.overlayRef) return;
    const target = event.target as Node;
    if (this.host.nativeElement.contains(target)) return;
    if (this.overlayRef.overlayElement.contains(target)) return;
    this.close();
  }
}
