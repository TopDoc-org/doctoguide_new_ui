import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { OverlayPanelDirective } from '../overlay/overlay-panel.directive';

export interface CommandItem {
  id: string;
  label: string;
  /** ds-icon name. */
  icon?: string;
  /** Grouping header, e.g. "Navigate", "Actions". */
  group?: string;
  /** Extra words to match on that are not in the label — synonyms, route paths. */
  keywords?: string;
}

/**
 * Cmd/Ctrl+K command palette. CONSOLES ONLY.
 *
 * Not on the public routes and not in /triage, deliberately: a keyboard-driven
 * launcher is dead weight on a phone-first consumer surface, where it would
 * ship bytes and an invisible shortcut to users who have no keyboard. The
 * consoles are the opposite — a handful of operators, on laptops, moving
 * between the same six screens all day.
 *
 *   <ds-command-palette [(open)]="paletteOpen" [items]="commands"
 *                       (selected)="run($event)" />
 *
 * The trigger shortcut is owned by this component (a document-level keydown),
 * so a console shell only has to render it. Escape and the focus trap come from
 * `dsOverlayPanel` like every other modal here.
 */
@Component({
  selector: 'ds-command-palette',
  standalone: true,
  imports: [IconComponent, OverlayPanelDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-popover flex items-start justify-center p-4 pt-[12vh]">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
             (click)="close()"></div>

        <div
          dsOverlayPanel
          (dismiss)="close()"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          class="relative w-full max-w-lg overflow-hidden rounded-2xl glass-3 shadow-e3 animate-scale-in">
          <div class="flex items-center gap-3 px-4 h-14 border-b border-line/10">
            <ds-icon name="search" [size]="18" class="shrink-0 text-muted" />
            <input
              #search
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls="ds-command-list"
              [attr.aria-activedescendant]="activeId()"
              autocomplete="off"
              spellcheck="false"
              placeholder="Search commands…"
              [value]="query()"
              (input)="onQuery($event)"
              class="min-w-0 flex-1 bg-transparent text-base text-content placeholder:text-muted
                     outline-none border-0" />
            <kbd class="hidden sm:inline-block shrink-0 rounded-md border border-line/15 bg-surface-2/60
                        px-1.5 py-0.5 font-mono text-[11px] text-muted">esc</kbd>
          </div>

          <ul id="ds-command-list" role="listbox" aria-label="Commands"
              class="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain p-2">
            @for (row of rows(); track row.key) {
              @if (row.header) {
                <li role="presentation"
                    class="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {{ row.header }}
                </li>
              } @else if (row.item; as item) {
                <li role="none">
                  <button
                    type="button"
                    role="option"
                    [id]="'ds-command-' + item.id"
                    [attr.aria-selected]="activeIndex() === row.index"
                    (click)="choose(item)"
                    (pointermove)="activeIndex.set(row.index)"
                    [class]="rowClass(activeIndex() === row.index)">
                    @if (item.icon) {
                      <ds-icon [name]="item.icon" [size]="16" class="shrink-0 text-muted" />
                    }
                    <span class="min-w-0 truncate">{{ item.label }}</span>
                  </button>
                </li>
              }
            }

            @if (!matches().length) {
              <li role="presentation" class="px-3 py-8 text-center text-sm text-muted">
                No commands match that search.
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class CommandPaletteComponent {
  readonly open = model(false);
  readonly items = input<CommandItem[]>([]);
  readonly selected = output<CommandItem>();

  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');

  constructor() {
    effect(() => {
      if (this.open()) {
        // Reset on every open. A palette that remembers the last query makes
        // the second use start from a filtered list, which reads as broken.
        this.query.set('');
        this.activeIndex.set(0);
        // The focus trap captures into the panel; this puts the caret in the
        // input specifically, which is the only useful landing spot.
        queueMicrotask(() => this.search()?.nativeElement.focus());
      }
    });
  }

  /**
   * Substring match across label and keywords. Not fuzzy: fuzzy matching over a
   * list of six to ten fixed commands surfaces nonsense hits ("dashboard"
   * matching "add board") and there is nothing to be gained over typing three
   * correct letters.
   */
  protected readonly matches = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.items();
    if (!q) return all;
    return all.filter((i) => (i.label + ' ' + (i.keywords ?? '')).toLowerCase().includes(q));
  });

  /**
   * Flattened rows — group headers interleaved with items — so the template is
   * one loop instead of nested loops that would break the flat index the
   * keyboard navigation and `aria-activedescendant` both need.
   */
  protected readonly rows = computed(() => {
    const out: { key: string; header?: string; item?: CommandItem; index: number }[] = [];
    let lastGroup: string | undefined;
    this.matches().forEach((item, index) => {
      if (item.group && item.group !== lastGroup) {
        out.push({ key: 'h-' + item.group, header: item.group, index: -1 });
        lastGroup = item.group;
      }
      out.push({ key: item.id, item, index });
    });
    return out;
  });

  protected readonly activeId = computed(() => {
    const item = this.matches()[this.activeIndex()];
    return item ? 'ds-command-' + item.id : null;
  });

  protected rowClass(isActive: boolean): string {
    const base =
      'flex w-full items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm text-left ' +
      'transition-colors duration-fast';
    return isActive ? base + ' bg-teal-500/12 text-content-strong' : base + ' text-content';
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    // Any keystroke re-aims at the top result; leaving the cursor on index 4
    // of a list that just changed means Enter runs something unrelated.
    this.activeIndex.set(0);
  }

  protected choose(item: CommandItem): void {
    this.selected.emit(item);
    this.close();
  }

  protected close(): void {
    this.open.set(false);
  }

  /**
   * Cmd+K on macOS, Ctrl+K elsewhere. Bound at the document so the shortcut
   * works wherever focus is — which is the point of a palette.
   *
   * `preventDefault` matters: Ctrl+K is Firefox's "focus search bar" and
   * Safari's too, and without it both browsers steal the keypress.
   */
  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.open.set(!this.open());
      return;
    }

    if (!this.open()) return;

    const total = this.matches().length;
    if (!total) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => (i + 1) % total);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => (i - 1 + total) % total);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.matches()[this.activeIndex()];
      if (item) this.choose(item);
    }
  }
}
