import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A data table with a MANDATORY mobile presentation.
 *
 * It projects two views of the same rows and shows exactly one:
 *
 *   <ds-table caption="Leads">
 *     <ng-container cards>          <!-- shown below `sm:` -->
 *       @for (lead of leads(); track lead.id) { <article>…</article> }
 *     </ng-container>
 *     <table>…</table>              <!-- shown from `sm:` -->
 *   </ds-table>
 *
 * WHY BOTH, AND WHY THIS IS NOT A CONFIG-DRIVEN TABLE.
 *
 * The consoles have 8- and 9-column tables. There is no arrangement of eight
 * columns that works on a 375px screen: `overflow-x-auto` technically prevents
 * the page from breaking, but it hides seven columns behind a horizontal
 * gesture nobody discovers, and it is the entire mobile story for
 * owner-clinics, owner-campaigns and partner-campaigns today. `admin-leads`
 * already worked around it by hand-writing a `sm:hidden` card list beside a
 * `hidden sm:block` table — this component is that pattern, named, so the next
 * table gets it for free instead of getting horizontal scroll.
 *
 * A column-config API (`[columns]="[…]"`) was the obvious alternative and is
 * the wrong one: the card view is not a re-flowed table row. It picks three or
 * four fields, gives one of them prominence, and drops the rest. That is an
 * editorial decision per table, and a config object either cannot express it or
 * grows until it is a template written in JSON.
 *
 * The desktop table still gets `overflow-x-auto` as a floor — a 9-column table
 * at 640px genuinely does need it — but it is no longer load-bearing.
 */
@Component({
  selector: 'ds-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Card list: mobile only. -->
    <div class="sm:hidden flex flex-col gap-2.5">
      <ng-content select="[cards]" />
    </div>

    <!-- Table: 'sm:' and up. Its own scroll container so a wide table scrolls
         inside the card instead of scrolling the PAGE sideways, which is the
         failure the SEO prose tables had before styles.scss fixed them. -->
    <div
      class="hidden sm:block overflow-x-auto overscroll-x-contain rounded-xl border border-line/10 bg-surface"
      [attr.tabindex]="scrollable() ? 0 : null"
      [attr.role]="scrollable() ? 'region' : null"
      [attr.aria-label]="scrollable() ? caption() : null">
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      /* Table chrome lives here so every console table agrees without each one
         restating twelve utility classes on every <th> and <td>. Applied by
         element, inside this component only. */
      :host ::ng-deep table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }

      :host ::ng-deep thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        /* Opaque, not glass: a sticky header over scrolling table rows is the
           one place blur costs real per-frame work, and rows sliding under a
           frosted header is visually noisy rather than premium. */
        background: rgb(var(--surface-2));
        padding: 0.625rem 0.875rem;
        text-align: left;
        font-weight: 600;
        white-space: nowrap;
        color: rgb(var(--text-muted));
        border-bottom: 1px solid rgb(var(--border) / 0.08);
      }

      :host ::ng-deep tbody td {
        padding: 0.75rem 0.875rem;
        vertical-align: top;
        color: rgb(var(--text));
        border-bottom: 1px solid rgb(var(--border) / 0.06);
      }

      :host ::ng-deep tbody tr:last-child td { border-bottom: 0; }
      :host ::ng-deep tbody tr:hover td { background: rgb(var(--surface-2) / 0.5); }

      /* Numbers align on their digits, which is the only way a column of them
         can be compared by eye. */
      :host ::ng-deep :is(th, td).num { text-align: right; font-variant-numeric: tabular-nums; }
    `,
  ],
})
export class TableComponent {
  /** Names the scroll region for AT. Required whenever `scrollable` is on. */
  readonly caption = input('Table');

  /**
   * Makes the table's scroll container keyboard-focusable and labelled.
   * Set it when the table really is wider than its column — a focusable
   * region that never scrolls is just an extra tab stop.
   */
  readonly scrollable = input(false);
}
