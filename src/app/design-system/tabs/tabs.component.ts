import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

export interface TabItem {
  /** Stable id used as the model value. */
  id: string;
  label: string;
  /** Optional leading icon — registered name from `core/icons.ts`. */
  icon?: string;
  /** Optional count badge — lead counts, campaign counts. */
  badge?: number | string;
  /**
   * Makes this tab a real link. Present on ROUTED strips (the console shells,
   * where each tab is a route); absent on in-page strips, where the caller
   * switches a panel off `active`.
   */
  link?: string | unknown[];
  disabled?: boolean;
}

/**
 * A tab strip. Owns the TABLIST only — the caller renders the panel, because
 * the panels in this app are whole route-sized views and projecting them all
 * into one component would mount every tab's content at once.
 *
 *   <ds-tabs [tabs]="tabs" [(active)]="active" />
 *   @switch (active()) { @case ('leads') { <app-leads /> } … }
 *
 * ROUTED VARIANT. Give each tab a `link` and drive `active` from the URL:
 *
 *   <ds-tabs [tabs]="sections" [active]="activeSection()" ariaLabel="Admin sections" />
 *
 * Tabs then render as `<a routerLink>`, which is the whole point — a console
 * section IS a URL, and a `<button>` cannot be middle-clicked into a new tab,
 * copied as a link, or shown in the status bar on hover. `active` stays an
 * input here rather than being derived internally, because only the caller
 * knows how its URLs map to ids.
 *
 * Keyboard model per WAI-ARIA: ONE tab stop for the whole strip, arrows move
 * between tabs, Home/End jump to the ends. `tabindex="-1"` on the inactive tabs
 * is what collapses them into a single stop — without it, tabbing through a
 * console with eight tabs means eight presses to reach the content.
 *
 * Arrow keys AUTOMATICALLY activate a button strip and only MOVE FOCUS on a
 * routed one (both are WAI-ARIA sanctioned — automatic and manual activation).
 * Auto-activation on a routed strip would fire a route change per keypress,
 * so arrowing from the first section to the fourth would load and destroy two
 * whole views on the way; Enter follows the link, which is what the anchor
 * already does.
 *
 * Mobile: the strip scrolls horizontally with snap points and the active tab is
 * scrolled into view, so a strip wider than the screen is still navigable. That
 * replaces the `overflow-x-auto whitespace-nowrap` pill rows the three console
 * shells each hand-rolled, none of which scrolled the active tab into view —
 * so deep-linking to the last tab on a phone showed an apparently empty strip.
 */
@Component({
  selector: 'ds-tabs',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #strip
      role="tablist"
      [attr.aria-label]="ariaLabel()"
      (keydown)="onKeydown($event)"
      class="flex gap-1.5 overflow-x-auto snap-x snap-mandatory scrollbar-none
             -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5">
      @for (tab of tabs(); track tab.id) {
        @if (tab.link) {
          <a
            role="tab"
            [id]="'tab-' + tab.id"
            [routerLink]="tab.link"
            [attr.aria-selected]="active() === tab.id"
            [attr.aria-controls]="'panel-' + tab.id"
            [tabindex]="active() === tab.id ? 0 : -1"
            [class]="tabClass(active() === tab.id)">
            <ng-container *ngTemplateOutlet="body; context: { $implicit: tab }" />
          </a>
        } @else {
          <button
            type="button"
            role="tab"
            [id]="'tab-' + tab.id"
            [attr.aria-selected]="active() === tab.id"
            [attr.aria-controls]="'panel-' + tab.id"
            [tabindex]="active() === tab.id ? 0 : -1"
            [disabled]="!!tab.disabled"
            (click)="select(tab)"
            [class]="tabClass(active() === tab.id)">
            <ng-container *ngTemplateOutlet="body; context: { $implicit: tab }" />
          </button>
        }
      }
    </div>

    <ng-template #body let-tab>
      @if (tab.icon) {
        <ds-icon [name]="tab.icon" [size]="17" class="-ml-0.5 shrink-0" />
      }
      {{ tab.label }}
      @if (tab.badge !== undefined && tab.badge !== null) {
        <span
          class="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5
                 rounded-full text-[11px] font-semibold tabular-nums"
          [class]="active() === tab.id ? 'bg-surface/25 text-white' : 'bg-content/10 text-muted'">
          {{ tab.badge }}
        </span>
      }
    </ng-template>
  `,
  styles: [
    `
      :host { display: block; }
      /* Tailwind has no scrollbar utility. A visible horizontal scrollbar under
         a pill strip reads as a broken layout on desktop, and the strip is
         swipeable on touch where there is no scrollbar to begin with. */
      .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
      .scrollbar-none::-webkit-scrollbar { display: none; }
    `,
  ],
})
export class TabsComponent {
  readonly tabs = input<TabItem[]>([]);
  readonly active = model<string>('');
  readonly ariaLabel = input('Sections');

  /**
   * Which accent the selected pill wears. The three console realms are GRASS,
   * not the brand teal — a teal pill sitting in a green app bar reads as a
   * stray from another product, which is exactly how it looked before this
   * input existed.
   */
  readonly tone = input<'brand' | 'console'>('brand');

  private readonly strip = viewChild.required<ElementRef<HTMLElement>>('strip');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** A strip is routed if ANY tab carries a link — they are never mixed. */
  private readonly routed = computed(() => this.tabs().some((t) => !!t.link));

  constructor() {
    // Keep the active tab visible when `active` changes from OUTSIDE the strip
    // — a route change, a deep link, a browser Back. Without this the routed
    // console strips reproduce exactly the bug this component exists to fix:
    // landing on /partner/offers on a phone shows a strip scrolled to its
    // start, with the selected tab off the right edge.
    effect(() => {
      const id = this.active();
      if (this.isBrowser && id) this.scrollIntoView(id);
    });
  }

  protected tabClass(isActive: boolean): string {
    const base =
      'snap-start shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full ' +
      'text-sm font-semibold whitespace-nowrap no-underline ' +
      'transition-all duration-fast ease-standard focus-visible:focus-ring ' +
      'disabled:opacity-45 disabled:pointer-events-none';
    const fill = this.tone() === 'console' ? 'bg-grass-600' : 'bg-teal-600';
    return isActive
      ? `${base} ${fill} text-white shadow-e1`
      : `${base} text-muted hover:text-content hover:bg-surface-2/70`;
  }

  protected select(tab: TabItem): void {
    if (tab.disabled) return;
    this.active.set(tab.id);
    this.scrollIntoView(tab.id);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const enabled = this.tabs().filter((t) => !t.disabled);
    if (!enabled.length) return;

    const current = enabled.findIndex((t) => t.id === this.active());
    const go = (index: number) => {
      event.preventDefault();
      const next = enabled[(index + enabled.length) % enabled.length];
      // Manual activation on a routed strip: focus moves, the URL does not.
      // Automatic activation otherwise — arrow keys on an in-page tablist are
      // "activate this tab", not "preview it", and leaving focus behind means
      // the next arrow press moves relative to a tab that is no longer
      // selected.
      if (!this.routed()) this.active.set(next.id);
      this.focusTab(next.id);
    };

    switch (event.key) {
      case 'ArrowRight': return go(current + 1);
      case 'ArrowLeft':  return go(current - 1);
      case 'Home':       return go(0);
      case 'End':        return go(enabled.length - 1);
    }
  }

  private focusTab(id: string): void {
    this.strip()
      .nativeElement.querySelector<HTMLElement>(`#tab-${CSS.escape(id)}`)
      ?.focus();
    this.scrollIntoView(id);
  }

  private scrollIntoView(id: string): void {
    const el = this.strip().nativeElement.querySelector<HTMLElement>(`#tab-${CSS.escape(id)}`);
    // `nearest` on the block axis so selecting a tab never scrolls the PAGE —
    // only the strip. `scrollIntoView` defaults to centring vertically too,
    // which on a sticky console header jumps the whole view.
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }
}
