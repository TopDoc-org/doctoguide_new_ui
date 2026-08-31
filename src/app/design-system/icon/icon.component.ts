import { ChangeDetectionStrategy, Component, computed, input, isDevMode } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { REGISTERED_ICON_NAMES } from '../../core/icons';

/**
 * Material-Icons ligature -> Lucide name.
 *
 * v1 rendered icons as `<span class="material-icons">person</span>` — 172 of
 * them across 25 files. Keeping the OLD Material ligature as this component's
 * public API is what makes porting a template a pure textual substitution
 * rather than 172 individual naming decisions:
 *
 *   <span class="material-icons text-teal-600">person</span>
 *   ->  <ds-icon name="person" class="text-teal-600" />
 *
 * Values are pick() KEYS kebab-cased (see core/icons.ts), not lucide filenames.
 */
/** Rendered when a name cannot be resolved. Must always be in pick(). */
const FALLBACK_ICON = 'circle';

const MATERIAL_ICON_MAP: Record<string, string> = {
  add: 'plus',
  alt_route: 'route',
  add_comment: 'message-square-plus',
  ads_click: 'mouse-pointer-click',
  arrow_back: 'arrow-left',
  arrow_forward: 'arrow-right',
  auto_awesome: 'sparkles',
  biotech: 'microscope',
  bolt: 'zap',
  call: 'phone',
  campaign: 'megaphone',
  chat: 'message-circle',
  chat_bubble_outline: 'message-circle',
  check_circle: 'check-circle',
  chevron_right: 'chevron-right',
  close: 'x',
  // No "card off" glyph in lucide; the semantics at the call site are
  // "no card needed", which a plain card reads as well enough.
  credit_card_off: 'credit-card',
  description: 'file-text',
  directions: 'navigation',
  download: 'download',
  edit_location_alt: 'pen-line',
  edit_note: 'pen-line',
  emergency: 'siren',
  event: 'calendar',
  expand_less: 'chevron-up',
  forum: 'messages-square',
  expand_more: 'chevron-down',
  group: 'users',
  group_add: 'user-plus',
  handshake: 'handshake',
  healing: 'heart-pulse',
  history: 'history',
  how_to_reg: 'user-check',
  hub: 'git-merge',
  info: 'info',
  insights: 'trending-up',
  ios_share: 'share-2',
  link: 'link',
  local_offer: 'tag',
  location_off: 'map-pin-off',
  location_on: 'map-pin',
  lock: 'lock',
  login: 'log-in',
  logout: 'log-out',
  medical_services: 'stethoscope',
  menu_book: 'book-open',
  // "no cost" semantics; lucide has no crossed-out banknote
  money_off: 'ban',
  menu: 'menu',
  my_location: 'crosshair',
  password: 'key-round',
  payments: 'wallet',
  person: 'user',
  place: 'map-pin',
  refresh: 'refresh-cw',
  remove: 'minus',
  schedule: 'clock',
  science: 'flask-conical',
  send: 'send',
  shield: 'shield',
  sort: 'arrow-up-down',
  space_dashboard: 'layout-dashboard',
  star: 'star',
  store: 'store',
  storefront: 'store',
  translate: 'languages',
  travel_explore: 'globe',
  trending_up: 'trending-up',
  verified: 'badge-check',
  verified_user: 'shield-check',
};

/**
 * Icon bridge. Accepts either a Material ligature (mapped above) or a Lucide
 * name directly, so ported v1 markup and new code can both use it.
 *
 * The `:host` display rule replaces v1's global `.material-icons {
 * vertical-align: middle }`, so alignment survives without touching any of the
 * layout classes at the call sites.
 */
@Component({
  selector: 'ds-icon',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lucide-icon
      [name]="lucideName()"
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true" />
  `,
  styles: [`:host { display: inline-flex; align-items: center; vertical-align: middle; }`],
})
export class IconComponent {
  /** Material ligature (e.g. "person") or a Lucide name (e.g. "user"). */
  name = input.required<string>();
  size = input(20);
  /** Material's filled glyphs read heavier than Lucide's strokes; nudge up on
   *  icon-dense screens if a review flags them as too light. */
  strokeWidth = input(2);

  protected lucideName = computed(() => {
    const raw = this.name();
    const mapped = MATERIAL_ICON_MAP[raw] ?? raw;

    if (REGISTERED_ICON_NAMES.has(mapped)) return mapped;

    // FAIL SAFE — this is the important part, not the warning.
    //
    // lucide-angular THROWS from ngOnChanges when handed a name it has not been
    // given ("The <x> icon has not been provided by any available icon
    // providers"). That throw aborts the whole update pass of the surrounding
    // component, so a single unmapped ligature silently blanks every binding on
    // the page: interpolations render empty and @if / @for collapse to nothing,
    // while the static DOM still serializes. During prerender it is completely
    // silent in the built output.
    //
    // That is exactly what three unmapped ligatures (forum, money_off,
    // alt_route, all coming from TS data arrays rather than template spans) did
    // to the landing pages. Degrading to a neutral dot keeps the blast radius
    // at one icon.
    if (isDevMode()) {
      console.warn(
        `[ds-icon] "${raw}" -> "${mapped}" is not registered; rendering a placeholder. ` +
        `Add its PascalCase key to core/icons.ts pick(), or map it in MATERIAL_ICON_MAP.`,
      );
    }
    return FALLBACK_ICON;
  });
}
