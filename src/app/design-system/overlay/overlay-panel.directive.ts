import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
  output,
} from '@angular/core';
import { OverlayStackService } from './overlay-stack.service';

/**
 * Everything an overlay panel owes the user, in one directive.
 *
 * Put it on the PANEL element (the dialog card, the sheet, the drawer aside) —
 * not on the backdrop, and not on the wrapper. It provides:
 *
 *  - a real focus trap, via CDK's `cdkTrapFocus` as a host directive, with
 *    autoCapture on so focus moves into the panel when it appears and returns
 *    to whatever opened it when it goes away. This is the part that cannot be
 *    hand-rolled correctly: `element.focus()` moves focus in but does nothing
 *    to stop Tab walking straight back out into the page behind, and restoring
 *    focus afterwards means having stashed the trigger before the DOM changed.
 *  - registration with `OverlayStackService`, which refcounts the body scroll
 *    lock and decides who Escape belongs to.
 *  - `dismiss`, emitted on Escape ONLY when this panel is topmost.
 *
 * It does NOT render a backdrop or animate anything. Those differ per overlay
 * (a drawer slides from the edge, a sheet from the bottom, a dialog scales in
 * place) and belong to the component, which is also what makes this reusable
 * rather than a base class every overlay has to extend.
 *
 * The host is given `tabindex="-1"` so autoCapture has something to land on
 * when the panel's first child is not itself focusable.
 */
@Directive({
  selector: '[dsOverlayPanel]',
  standalone: true,
  hostDirectives: [
    {
      directive: CdkTrapFocus,
      inputs: ['cdkTrapFocusAutoCapture: dsOverlayAutoFocus'],
    },
  ],
})
export class OverlayPanelDirective implements OnInit, OnDestroy {
  /** Fired when Escape is pressed and this panel is the topmost one. */
  readonly dismiss = output<void>();

  private readonly stack = inject(OverlayStackService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly trapFocus = inject(CdkTrapFocus, { self: true });

  constructor() {
    // Focus capture defaults ON. A dialog that does not take focus when it
    // opens is a dialog a keyboard user has to hunt for.
    //
    // Set in the CONSTRUCTOR, not ngOnInit, and that ordering is the whole
    // trick: Angular applies bound inputs after construction and before
    // ngOnInit, so a call site that writes `[dsOverlayAutoFocus]="false"`
    // overrides this, while one that says nothing keeps it. Assigning in
    // ngOnInit would instead clobber the binding. (Checking for `undefined`
    // first does not work either — CdkTrapFocus initialises `autoCapture` to
    // `false`, so it is never undefined to begin with.)
    this.trapFocus.autoCapture = true;
  }

  ngOnInit(): void {
    this.renderer.setAttribute(this.host.nativeElement, 'tabindex', '-1');
    this.stack.push(this);
  }

  ngOnDestroy(): void {
    this.stack.pop(this);
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected onEscape(event: KeyboardEvent): void {
    if (!this.stack.isTop(this)) return;
    // Stop the keypress reaching an overlay further down the stack that has not
    // yet been told it is no longer on top.
    event.stopPropagation();
    event.preventDefault();
    this.dismiss.emit();
  }
}
