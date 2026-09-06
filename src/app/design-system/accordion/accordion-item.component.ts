import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * A disclosure. Native `<details>` / `<summary>`.
 *
 * The platform element, not a button plus an `@if`, and that choice buys three
 * things worth more than a height animation:
 *
 *  1. **It works before Angular boots.** All 22 public routes are prerendered,
 *     and a `<details>` in prerendered HTML opens on tap during the hydration
 *     gap. A component-driven accordion is inert until the JS lands.
 *  2. **Ctrl+F finds text inside a closed one.** Chrome and Safari auto-expand
 *     a closed `<details>` when the find-in-page query matches inside it. That
 *     matters on the FAQ-shaped SEO pages, which is where this is used.
 *  3. The expand semantics, keyboard toggle and AT announcement are already
 *     correct and need no ARIA at all.
 *
 * The cost is that the open/close height cannot be transitioned in a way that
 * works everywhere (`content-visibility` / `interpolate-size` are not
 * dependable in the Android WebView this ships in), so only the chevron
 * animates. A silent snap open is a fair trade for content that is findable.
 *
 * `.seo-prose details` in styles.scss already styles bare `<details>` inside
 * projected prose; this component is for accordions built in a template, where
 * that selector does not reach.
 */
@Component({
  selector: 'ds-accordion-item',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details
      class="group rounded-xl border border-line/10 bg-surface overflow-hidden
             transition-colors duration-fast open:bg-surface-2/40"
      [attr.name]="group() || null"
      [open]="open()">
      <summary
        class="flex items-center justify-between gap-3 min-h-[44px] px-4 py-3 cursor-pointer
               list-none select-none font-heading font-semibold text-content-strong
               hover:bg-surface-2/50 transition-colors duration-fast">
        <span class="min-w-0">{{ heading() }}</span>
        <ds-icon
          name="chevron-down"
          [size]="18"
          class="shrink-0 text-muted transition-transform duration-base ease-standard
                 group-open:rotate-180" />
      </summary>
      <div class="px-4 pb-4 pt-0 text-sm text-content/90">
        <ng-content />
      </div>
    </details>
  `,
  styles: [
    `
      :host { display: block; }
      /* Safari and Chrome each draw their own disclosure triangle on <summary>
         through a different pseudo-element, and neither is removed by
         "list-style: none" alone. (No backticks in here: this comment is
         inside a template literal, and one would close the string.) */
      summary::-webkit-details-marker { display: none; }
      summary::marker { content: ''; }
    `,
  ],
})
export class AccordionItemComponent {
  readonly heading = input.required<string>();
  readonly open = input(false);

  /**
   * Share a `group` name across items to make them mutually exclusive — the
   * HTML `name` attribute on `<details>` does this natively, with no JS.
   * Leave it unset for independently expandable items, which is usually right
   * for an FAQ: a reader comparing two answers should not have to lose one.
   */
  readonly group = input('');
}
