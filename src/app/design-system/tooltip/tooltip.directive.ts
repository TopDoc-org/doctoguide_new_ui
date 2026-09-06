import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';

/** The bubble. Separate from the directive only because a portal needs a component. */
@Component({
  selector: 'ds-tooltip-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    class="pointer-events-none max-w-[16rem] rounded-lg bg-content-strong/95 px-2.5 py-1.5
           text-xs font-medium text-white shadow-e2 animate-fade-in">
    {{ text() }}
  </div>`,
})
export class TooltipBubbleComponent {
  // A signal, not a plain field: the portal sets this AFTER attach, and an
  // OnPush component with a plain field would only pick it up if change
  // detection happened to run again. Writing a signal marks the view dirty.
  readonly text = signal('');
}

/**
 * A hover tooltip.
 *
 *   <button dsTooltip="Download report" aria-label="Download report">…</button>
 *
 * POINTER ONLY. On a touch device it does nothing at all — there is no hover,
 * and the usual workaround (show it on long-press, or on tap before the tap
 * acts) either hides the thing you tapped or delays the action. A tooltip that
 * cannot be reached is not an accessibility feature, so the rule here is:
 *
 *   the tooltip is an ENHANCEMENT, never the only label.
 *
 * An icon-only control must carry its own `aria-label` regardless — which is
 * why this directive does not set one. Wiring `aria-describedby` to the bubble
 * would make the label depend on an element that exists only while hovering,
 * and touch and screen-reader users would get nothing.
 */
@Directive({
  selector: '[dsTooltip]',
  standalone: true,
})
export class TooltipDirective {
  readonly text = input.required<string>({ alias: 'dsTooltip' });
  /** Delay before showing, ms. Long enough that passing over a toolbar is quiet. */
  readonly delay = input(400);

  private readonly overlay = inject(Overlay);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private ref: OverlayRef | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.hide());
  }

  @HostListener('pointerenter', ['$event'])
  protected onEnter(event: PointerEvent): void {
    // `pointerenter` fires for touch too, right before the tap. Filtering on
    // pointerType is what keeps the bubble off phones.
    if (event.pointerType !== 'mouse') return;
    this.timer = setTimeout(() => this.show(), this.delay());
  }

  @HostListener('pointerleave')
  @HostListener('pointerdown')
  // Escape dismisses a stuck tooltip — and one CAN stick: `pointerleave` never
  // fires if the element is removed or disabled while hovered.
  @HostListener('document:keydown.escape')
  protected hide(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.ref?.dispose();
    this.ref = null;
  }

  // Keyboard users get it on focus, which is the one case where a tooltip is
  // reachable without a pointer.
  @HostListener('focusin')
  protected onFocus(): void {
    this.show();
  }

  @HostListener('focusout')
  protected onBlur(): void {
    this.hide();
  }

  private show(): void {
    if (this.ref || !this.text()) return;

    this.ref = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.host)
        .withPositions([
          { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
          { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
        ]),
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: false,
    });

    const instance = this.ref.attach(new ComponentPortal(TooltipBubbleComponent)).instance;
    instance.text.set(this.text());
  }
}
