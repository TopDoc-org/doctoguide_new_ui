import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

export interface BottomNavItem {
  label: string;
  /** ds-icon name (Material ligature or Lucide kebab name — see ds-icon). */
  icon: string;
  link: string | unknown[];
  /** Exact route matching. Use for a section root that would otherwise stay lit. */
  exact?: boolean;
  badge?: number | string;
}

/**
 * Mobile primary navigation. Glass, fixed to the bottom, `md:hidden`.
 *
 * This is the keystone of the mobile redesign, and it replaces nothing —
 * before it, the three consoles' only navigation was a horizontally scrolling
 * pill row at the top of the page, which on a phone is both the hardest place
 * to reach and the first thing to scroll away.
 *
 * Rules it encodes:
 *  - **Three to five items.** Below three a bottom bar is wasted chrome; above
 *    five the targets fall under 44px on a 360px screen. Not enforced in code —
 *    a runtime error for a design mistake is not worth the bytes — but a
 *    six-item bar WILL be cramped and that is the reason.
 *  - **Icon plus label, always.** Icon-only bottom bars are a guessing game,
 *    and the label costs one line of a bar that is already 56px tall.
 *  - **`pb-safe-b`** so the row clears the iOS home indicator and Android
 *    gesture bar instead of sitting under them.
 *
 * The page behind must reserve the space — this is `fixed`, so it does not push
 * content. Give the scroll container `pb-[calc(4rem+var(--safe-bottom))] md:pb-0`
 * or the last row of every list ends up under the bar.
 */
@Component({
  selector: 'ds-bottom-nav',
  standalone: true,
  imports: [IconComponent, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      [attr.aria-label]="ariaLabel()"
      class="fixed inset-x-0 bottom-0 z-nav md:hidden glass-2 border-t shadow-e2 pb-safe-b">
      <ul class="flex items-stretch">
        @for (item of items(); track item.label) {
          <li class="flex-1">
            <a
              [routerLink]="item.link"
              routerLinkActive="text-brand-ink dark:text-teal-300"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              #rla="routerLinkActive"
              [attr.aria-current]="rla.isActive ? 'page' : null"
              class="relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 py-1.5
                     text-muted transition-colors duration-fast
                     active:bg-content/[6%]">
              <span class="relative">
                <ds-icon [name]="item.icon" [size]="22" [strokeWidth]="rla.isActive ? 2.4 : 2" />
                @if (item.badge !== undefined && item.badge !== null) {
                  <!-- Badge sits on the icon, not next to the label: the label
                       is already the narrowest part of the target and a badge
                       beside it truncates the word on a 360px screen. -->
                  <span
                    class="absolute -right-2 -top-1 inline-flex items-center justify-center
                           min-w-[1.125rem] h-[1.125rem] px-1 rounded-full
                           bg-danger text-[11px] font-bold text-white tabular-nums">
                    {{ item.badge }}
                  </span>
                }
              </span>
              <span class="text-[11px] font-semibold leading-none truncate max-w-full">
                {{ item.label }}
              </span>
              <!-- Active indicator. A short bar at the top edge rather than a
                   filled pill: the bar survives being cropped by a narrow
                   column, a pill does not. -->
              @if (rla.isActive) {
                <span
                  class="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-teal-600"
                  aria-hidden="true"></span>
              }
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class BottomNavComponent {
  readonly items = input<BottomNavItem[]>([]);
  readonly ariaLabel = input('Primary');
}
