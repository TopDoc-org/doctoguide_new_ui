import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';

/**
 * The PANEL of a dropdown menu. Pair it with `dsPopover` on the trigger:
 *
 *   <button [dsPopover]="menu" [(popoverOpen)]="menuOpen" (click)="menuOpen.set(!menuOpen())"
 *           [attr.aria-expanded]="menuOpen()" aria-haspopup="menu">Account</button>
 *
 *   <ng-template #menu>
 *     <ds-dropdown-menu ariaLabel="Account">
 *       <button type="button" role="menuitem" class="ds-menu-item" (click)="…">Profile</button>
 *       <button type="button" role="menuitem" class="ds-menu-item" (click)="…">Sign out</button>
 *     </ds-dropdown-menu>
 *   </ng-template>
 *
 * Keyboard model is a MENU, not a dialog: arrows move between items, Home/End
 * jump to the ends, typing a letter jumps to the next item starting with it,
 * and Tab leaves the menu entirely (which closes it, via the popover's
 * click-away and blur handling). That is what a screen-reader user expects from
 * `role="menu"`, and it is the reason this is not built on the modal core.
 *
 * Items are projected rather than passed as a data array so a menu can hold a
 * link, a destructive action and a separator without this component growing a
 * config object for each. It finds them by `[role="menuitem"]`, so anything
 * carrying that role participates — including an `<a>`.
 */
@Component({
  selector: 'ds-dropdown-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #panel
      role="menu"
      [attr.aria-label]="ariaLabel()"
      (keydown)="onKeydown($event)"
      class="min-w-[11rem] max-w-[min(20rem,calc(100vw-2rem))] overflow-hidden
             rounded-xl glass-3 shadow-e3 p-1.5 animate-scale-in origin-top">
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      /* Item styling lives here, not on every call site: a menu whose items are
         each styled by hand stops looking like one menu the first time someone
         adds an item and forgets a class. Scoped to this component, applied by
         role, so an <a> and a <button> item are indistinguishable. */
      :host ::ng-deep [role='menuitem'] {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        width: 100%;
        min-height: 44px;
        padding: 0.5rem 0.75rem;
        border-radius: 12px;
        font-size: 0.875rem;
        text-align: left;
        color: rgb(var(--text));
        background: transparent;
        border: 0;
        cursor: pointer;
        transition: background-color var(--dur-fast) cubic-bezier(0.2, 0, 0, 1);
      }
      :host ::ng-deep [role='menuitem']:hover,
      :host ::ng-deep [role='menuitem']:focus-visible {
        background: rgb(var(--surface-2) / 0.75);
      }
      :host ::ng-deep [role='menuitem'][data-destructive] { color: rgb(var(--danger)); }
      :host ::ng-deep [role='menuitem'][disabled] { opacity: 0.45; pointer-events: none; }
      :host ::ng-deep hr {
        margin: 0.375rem -0.25rem;
        border: 0;
        border-top: 1px solid rgb(var(--border) / 0.08);
      }
    `,
  ],
})
export class DropdownMenuComponent implements AfterViewInit {
  readonly ariaLabel = input('Menu');

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  ngAfterViewInit(): void {
    // Focus the first item as the menu appears. Without it, opening with the
    // keyboard leaves focus on the trigger and the first ArrowDown does
    // nothing visible — the menu is open and apparently inert.
    //
    // Safe for mouse users too: the ring is drawn on `:focus-visible`, so a
    // click-opened menu takes focus without showing a focus ring on the first
    // item. It also gives the popover's click-away something sensible to
    // return from when the menu closes.
    this.items()[0]?.focus();
  }

  private items(): HTMLElement[] {
    return Array.from(
      this.panel().nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
    );
  }

  protected onKeydown(event: KeyboardEvent): void {
    const items = this.items();
    if (!items.length) return;

    const current = items.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      // Wraps in both directions: Up from the first item lands on the last,
      // which is how you reach "Sign out" at the bottom of a long menu in one
      // keypress.
      items[(to + items.length) % items.length].focus();
    };

    switch (event.key) {
      case 'ArrowDown': return move(current + 1);
      case 'ArrowUp':   return move(current - 1);
      case 'Home':      return move(0);
      case 'End':       return move(items.length - 1);
    }

    // Type-ahead. Single printable character only — a full incremental buffer
    // is more machinery than a menu of this size can repay.
    if (event.key.length === 1 && /\S/.test(event.key)) {
      const needle = event.key.toLowerCase();
      const from = current + 1;
      const match = items
        .slice(from)
        .concat(items.slice(0, Math.max(0, from)))
        .find((el) => el.textContent?.trim().toLowerCase().startsWith(needle));
      if (match) {
        event.preventDefault();
        match.focus();
      }
    }
  }
}
