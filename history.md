# DoctoGuide 2.0 redesign — working history

Append-only session log. Read this first after any session break, then
`MIGRATION-NOTES.md` for the load-bearing *decisions* (this file is the *log*).

Rule: every session appends a `## Session N` block with what changed, what was
verified, and what is next. Never rewrite an earlier block — if an earlier
decision turned out wrong, say so in the current block.

## Verify commands (the gate for every session)

```bash
npm run build            # must say "Prerendered 22 static routes" + "sitemap.xml written with 20 URLs", NO NG#### warnings
npm run parity           # 22 prerendered routes vs ../doctoguide-v2-baseline; exit 0
npm run parity:behaviour # endpoints / analytics / routes / storage keys unchanged; exit 0
npx ng test --watch=false
npm run apk:debug        # only when native surface changed
```

Deliberate public-route redesign → review output, then advance ONE route:
`npm run parity:snapshot -- /about`.

## Hard constraints (do not relearn these the hard way)

1. `AppComponent` stays **non-OnPush** (`app.component.ts:12`). ~58 async
   handlers in feature components mutate plain fields with no `markForCheck`.
2. New `ds-*` components are standalone + OnPush + signal API. Feature
   components are NOT opportunistically converted.
3. Everything prerenders with no browser — no `document` at construction time;
   guard with `afterNextRender` / `isPlatformBrowser`.
4. `backdrop-filter` janks on large scrolling surfaces in the Android WebView.
   Glass only on small fixed compositor-friendly surfaces.
5. Bundle budgets: 700 kB initial warn / 1.2 MB error, 8 kB per component style.
6. `lucide-angular` throws on an unregistered icon name and that blanks the whole
   component update pass. Register every new icon in `src/app/core/icons.ts`.
7. PrimeNG is already **completely gone** — not a dependency, zero usages. The
   brief's "remove PrimeNG" phase was finished during the 14→19 migration.

---

## Session 1-N (before this log existed) — reconstructed from the working tree

No `history.md` existed, so this block is reconstructed from `git status`,
`MIGRATION-NOTES.md` and the tree. Treat it as accurate about WHAT exists and
approximate about the order it happened in.

### Done — token layer (`src/styles.scss`, `tailwind.config.js`)

- **Glass ladder**, 3 levels ordered by *elevation*, not blur amount:
  `.glass-1` inline surface (card, glass button) · `.glass-2` app chrome (app
  bar, bottom nav, sticky header) · `.glass-3` overlay (sheet, dialog, popover,
  command palette). `.glass` is an alias of level 1, so every pre-existing call
  site renders unchanged. Dark runs MORE transparent than light at every level.
- **Fallbacks**: `@supports not (backdrop-filter)` and
  `prefers-reduced-transparency` both collapse to `rgb(var(--surface)/.97)`.
- **Blur tokens** `--blur-sm|md|xl` = 10/18/28px, wired into Tailwind
  `backdropBlur` (shadows the stock scale on purpose).
- **Motion tokens** `--dur-fast|base|slow` = 120/180/280ms → Tailwind
  `duration-fast|base|slow`, ADDED alongside the stock scale (~40 ported call
  sites still use `duration-150`).
- **Safe-area tokens** `--safe-t|b|l|r` → Tailwind spacing, so `pb-safe-b`
  composes instead of four shells inlining `env()`.
- **Named z-index**: `z-nav 30 · z-overlay 50 · z-popover 60 · z-toast 70`,
  in interaction order. Numeric `z-0..50` kept for local stacking.
- **Overlay keyframes**: `fade-in`, `slide-up`, `slide-in-right`,
  `slide-in-left`, all on `decelerate`. Backdrops fade; panels move from the
  edge they belong to — the motion is the affordance.
- **Radius rule** documented in-config: control `rounded-lg` · surface
  `rounded-xl` · sheet/dialog/drawer `rounded-2xl` · pill `rounded-full`.
  Applied as components are touched, never as a sweeping replace.

### Done — design system: 33 components in `src/app/design-system/`

Pre-existing (16): badge, button, card, carousel, date-field, drawer,
empty-state, icon, input, page-header, select, skeleton, spinner, textarea,
typewriter.

Added this redesign (17): accordion, avatar, bottom-nav, checkbox,
command-palette, dialog, dropdown-menu, overlay (`overlay-panel.directive` +
`overlay-stack.service`), popover, radio-group, sheet, switch, table, tabs,
theme-toggle, toast (+ `toast.service`), tooltip.

### Done — landing (`features/landing`)

Partially redesigned: now uses `ds-avatar`, `ds-dropdown-menu`, `ds-icon`,
`ds-sheet`, `ds-typewriter`. `ds-drawer` was reworked (-70 lines) to sit on the
new overlay primitives.

### Done — tooling

- `scripts/parity-snapshot.mjs` (new) — advance the baseline one route at a time.
- `scripts/parity-diff.mjs` — retargeted at `../doctoguide-v2-baseline`; the
  gate now asks "did anything move that I did not mean to move", not "does this
  still match v1".

### NOT done — the 17 new components are built but almost entirely UNWIRED

Usage outside `design-system/` at the start of this session:

| wired | unwired |
|---|---|
| theme-toggle, sheet, avatar, popover, dropdown-menu (landing only) | bottom-nav, toast, tabs, table, dialog, command-palette, accordion, switch, checkbox, radio-group, tooltip |

Untouched by the redesign: **/triage** (the core consult flow),
**seo-pages** (14 prerendered routes), **admin / owner / partner** consoles
(6 + 5 + 6 pages), **legal** (3 pages), **ad-landing**.

---

## Session 2 — the three console realms

Scope: admin / owner / partner. Chosen because they are the largest untouched
surface, they are noindex and never prerendered (so `parity` cannot see them at
all and only `parity:behaviour` applies), and they are where every unwired
`ds-*` component was built to be used.

### Done — dark mode was BROKEN in the consoles, and is now fixed at the token layer

The consoles were painted in `sand-*`, `stone-*` and stock Tailwind `amber-*`.
None of those swap under `[data-theme="dark"]` — `text-stone-900` stays
near-black on a near-black surface. `ThemeService` has had a UI since Session 1,
so this was reachable, not theoretical.

Fixed the same way the brand roles were: the ramp ENDS become named roles, the
mid-ramp FILLS stay palette because a saturated fill is correct in both themes.

| new role | light | dark | replaced |
|---|---|---|---|
| `console-ink` / `-soft` | grass-700 / -600 | grass-300 / -400 | `text-grass-700` / `-600` |
| `console-tint` / `-strong` | grass-50 / -100 | grass-800 / -700 | `bg-grass-50` / `-100` |
| `console-line` | grass-200 | grass-600 | `border-grass-200` |
| `console-gold` / `-soft` | amber-700 / -600 | amber-300 / -400 | the offers/promo accent |
| `console-gold-tint` / `-strong` / `-line` | amber-50 / -100 / -300 | amber-950 / -900 / -800 | |

Plus the neutrals onto the existing semantic tokens: `bg-sand-50` → `bg-bg`,
`bg-sand-100` → `bg-surface-2`, `border/ring-sand-200` → `border/ring-line/10`,
`text-stone-900|700|600|500|400` → `text-content-strong|content|content|muted|muted`,
`text-red-600` → `text-danger`, `text-green-700` → `text-success`.
**560 replacements across 16 templates.**

One trap worth naming: `bg-stone-900` was a THEME-INVARIANT dark slab (the two
login hero panels, the owner wordmark tile, the campaign summary card) carrying
white text. Mapping it to the `ink` ROLE puts white text on a near-white slab in
dark. It is `bg-grass-900` now — a palette step, so it stays dark in both
themes, and it is the console's own darkest green rather than a stray neutral.

### Done — `ds-tabs` gained a ROUTED mode, and the three shells were rebuilt on it

`TabItem` now takes `icon` and `link`. With `link`, tabs render as
`<a routerLink>` instead of `<button>` — a console section IS a URL, and a
button cannot be middle-clicked into a new tab or copied as a link. Arrow keys
switch from automatic to MANUAL activation on a routed strip: auto-activation
would fire a route change per keypress, so arrowing from the first section to
the fourth would mount and destroy two whole views on the way.

An `effect` scrolls the active tab into view when `active` changes from OUTSIDE
the strip (a route change, a deep link, Back) — without it the routed strips
reproduce the exact bug the component was written to fix.

The shells themselves:

- One scroll region, not two. The page scrolls; the app bar is `sticky top-0
  z-nav glass-2`. Previously `<main>` was its own `overflow-y-auto` box below a
  static header, so nothing ever passed under the bar and glass would have been
  decoration.
- `pt-safe-t` on the bar, `pb-[calc(1.5rem+var(--safe-bottom))]` on `<main>`.
- `ds-theme-toggle variant="glass"` is now reachable from all three consoles.
- `activeSection` is derived from the router URL with `toSignal` +
  `startWith(null)` so it is correct on a deep link, not only after the first
  in-app navigation. `routerLinkActive` could not do this — `ds-tabs` needs the
  ID for `aria-selected` and for the scroll, and a class tells it neither.
- Switched from constructor params to `inject()`: `activeSection` is a field
  initializer that reads `this.router`, and whether a parameter property is
  assigned before or after field initializers depends on
  `useDefineForClassFields`.

### Done — five data tables onto `ds-table`

owner-clinics, owner-campaigns (list + drill), admin-leads, partner-leads,
partner-campaigns. Three of those had NO mobile story at all — a 7-to-9 column
table in an `overflow-x-auto` box, which is seven columns hidden behind a
gesture nobody discovers. Each now has a real card view: three or four fields,
one of them prominent, and the row's action as an actual `<button>`.

The row-click on owner-clinics and owner-campaigns was a `tabindex="0"` `<tr>`
with a `keyup.enter` handler. That is focusable with no role, no accessible
name and no announced action. The row-click stays as the pointer affordance;
the keyboard and screen-reader path is now a named button in the last cell.

The two remaining `<table>` elements (admin-overview, partner-dashboard) are
`sr-only` chart data tables — already the accessible alternative for a chart,
correctly left alone.

### Done — `console-*` component classes

A ~220-character class attribute was restated inline on every console control,
about fifty times across sixteen templates, which is why the date inputs, the
selects and the search boxes had already drifted on background, text colour,
radius (`rounded-lg` vs `rounded-xl`) and focus-ring alpha (`/30` vs `/40`).
Now `.console-label`, `.console-field`, `.console-panel`, `.console-btn`,
`.console-btn-outline`, `.console-btn-ghost` in `@layer components`. The focus
ring is grass, not the global teal `.focus-ring` — a teal ring on a green
console reads as a stray. **70 call sites collapsed.**

### Done — `ToastService` wired (its first call sites)

CSV export is the one console action with NO on-screen result: on success the
only evidence is a file in the download tray, and on failure the old inline
`error` sat above a table the user was looking at the bottom of. All five
export flows now toast — success transient, failure sticky with a Retry action
that re-runs the right export (`exportCampaign(campaign)` on partner-campaigns,
not the `exportCsv()` that does not exist there). Load failures keep their
inline `role="alert"` paragraph: those are in view when they happen.

### Bugs found and fixed on the way (all pre-existing)

1. **Three `ds-*` components could never compile.** `table`, `dialog` and
   `toast.service` had markdown code spans inside their `template:` literals —
   a backtick there terminates the string. Nothing had imported them yet, so
   nothing had ever found out. 16 stray backticks.
2. **`border-line/` with no alpha**, 30+ call sites across the consoles AND
   landing / ad-landing / seo-page-layout / auth-gate. Not a class; Tailwind
   emits nothing, so every one of those borders was silently falling back to
   the global `* { border-color: rgb(var(--border) / .05) }`. From an earlier
   `border-black/5` → `border-line/` sweep that dropped the number.
3. **The iOS focus-zoom floor never applied to `<select>` or `<textarea>`.**
   `select { font-size: 16px }` is (0,0,1) and loses to the `text-sm` (0,1,0)
   those controls carry — specificity beats source order. It worked for
   `<input>` only by accident, because its three `:not([type=…])` guards score
   (0,3,1). Now `:is(select, textarea):not([data-small-ok])` at (0,1,1), which
   also gives a documented escape hatch.

### Verified

```
npm run build            Prerendered 22 static routes; sitemap 20 URLs; no NG#### warnings
npm run parity           all 22 routes match the baseline; exit 0
npm run parity:behaviour no v1 behaviour dropped
npx ng test              81 of 81 SUCCESS
```

`dist/doctoguide/browser/{admin,owner,partner,triage}` — none exist. No public
route moved, so no baseline needed advancing.

`apk:debug` NOT run — no native surface changed this session.

### Next

- **/triage** — the core consult flow, still entirely untouched by the
  redesign, and the biggest remaining surface (1351-line template).
- **seo-pages** (14 prerendered routes) and **legal** (3). These DO move the
  parity baseline, so each needs `parity:snapshot -- /route` per route.
- Still unwired: `bottom-nav`, `command-palette`, `accordion`, `switch`,
  `checkbox`, `radio-group`, `tooltip`, `dialog`. `dialog` and `tooltip` are
  the natural next two — the consoles have destructive actions with no
  confirmation and several icon-only controls.
- The console filter bar is now the same seven-control block in four
  templates. It wants to be one component, not one CSS class.
- The three console login pages and the partner signup were swept for tokens
  but not redesigned.

---

## Session 3 — /triage, and the dark-mode root cause

Ran the app and looked at it first (`ng serve` + Playwright at 390px and
1280px, both themes) rather than reading the template and guessing. That is
what found the two biggest problems, neither of which is visible in source.

### The palette question — asked, and answered "no"

Considered replacing the teal/cream identity. Decided against it, and this is
the reasoning so it does not get re-litigated:

The palette was not what made /triage look dated. Three things did — a
permanently-lit full-saturation red bar louder than the product itself, an
assistant "bubble" that was an unadorned white box with a hairline, and a
half-screen of dead cream between the last card and the composer. None of those
is a hue problem. Teal + cream is also the brand, it is what
doctoguide.knocdoc.in ships, and ~470 call sites reach it through role tokens.

So: same hue, better tone. The work went into contrast, presence and the dark
theme instead.

### `color-scheme` was never declared — the actual dark-mode root cause

Every raw `<input>` in the app rendered as a WHITE slab under
`[data-theme="dark"]`: the triage age field, the console date pickers, every
login form. The UA paints form controls, scrollbars and the native date picker
from the `color-scheme` property, not from our tokens, so no amount of Tailwind
on the element fixes it — and nothing in the codebase set it.

```scss
:root, :root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark']         { color-scheme: dark; }
```

Plus an element-level `input, select, textarea { background-color:
rgb(var(--surface)); color: rgb(var(--text)); }` as a floor for older WebViews
and for Chrome's `<input type="date">`. Element specificity on purpose: any
explicit `bg-*` utility is a class and still wins, so a control that opted into
its own surface keeps it.

**This was an app-wide bug, not a triage one.** It is why the consoles' date
filters looked wrong in dark after Session 2 even though every token was right.

### Status ROLE tokens — /triage's urgency ladder had no dark mode

The whole emergency / urgent / caution / reassure ladder was drawn in stock
`red-*`, `amber-*` and `green-*`. None of them swaps, so in dark it rendered
dark-on-dark. `--success` / `--warning` / `--danger` already existed but only as
SOLID fills; what was missing was ink, tint and hairline for each.

| role | light | dark |
|---|---|---|
| `danger-ink` / `-tint` / `-tint-strong` / `-line` | red-700 / -50 / -100 / -200 | red-300 / -950 / -900 / -800 |
| `warning-ink` / `-ink-soft` / `-tint` / `-tint-strong` / `-line` | amber-700 / -600 / -50 / -100 / -200 | amber-300 / -400 / -950 / -900 / -800 |
| `success-ink` / `-tint` / `-tint-strong` / `-line` | green-700 / -50 / -100 / -200 | green-300 / -950 / -900 / -800 |

116 replacements across 9 triage files. Mid-ramp fills (`bg-red-600` on the
emergency banner, `bg-amber-600` on "Load it") stay palette — a saturated fill
is correct in both themes.

Also `bg-cream` → `bg-bg` (identical in light, since `--bg` IS cream there) —
that one class on the shell root was why the page ground stayed cream behind
dark cards.

### The KnocDoc wordmark was two inline hexes in three templates

`style="color:#0a1480"` is a deep navy that disappears against a dark surface.
Now `--wm-knoc` / `--wm-doc` with `.wm-knoc` / `.wm-doc` classes; the navy lifts
to a readable periwinkle in dark.

### Chrome

- **Emergency banner kept at FULL saturation, deliberately.** It is the one line
  that must be unmissable, and toning it to a tint would be a safety change
  dressed as a design one. What changed is craft: it sat under the notch (now
  `pt-safe-t`), wrapped to two lines at 11px with no icon (now a siren glyph and
  a contained `max-w-2xl` line, which fits on one line from ~640px).
- **Header** stays solid, not glass — the thread is its own scroll region below
  it, so nothing ever passes under the bar. Glass there would blur the page
  ground and cost a compositor layer to look like a flat panel.
- `ds-theme-toggle` added — dark mode is real now, /triage needed a way in.
  That made a fifth control on a 390px header and the wordmark started
  truncating to "DoctoGui…", so "New chat" drops its label below `xs` (400px)
  and keeps the icon. The product name survives; a button label does not.
- Both footers moved off inline `style="padding-bottom: max(…, env(…))"` onto
  `pb-[max(0.75rem,var(--safe-bottom))]` — which is what the safe-area spacing
  tokens exist for.

### Conversation

- **Assistant avatar**, shown on the first bubble of a run only, `invisible`
  rather than removed so a follow-up keeps the same left edge — dropping the
  element would shift the whole run 36px and break the column.
- **Bubbles** gained `shadow-e1` and a real border. A white box with a 5%
  hairline on cream has no presence at all.
- **The thread is bottom-anchored** (`min-h-full flex flex-col justify-end`).
  The opening screen is three short blocks in a tall viewport and top-anchoring
  left half a screen of dead cream above the composer, which reads as a page
  that failed to finish loading. It is also where the conversation will be, so
  nothing jumps when the first reply lands.
- **Composer**: the textarea had a 10%-alpha border and no fill, so it read as a
  gap in the footer rather than as the thing you type into. Now
  `bg-surface-2/60`, brightening to `bg-surface` on focus.
- **The legal line** was 10px at 40% ink — present for compliance and unreadable
  in practice, on a medical product. Now 11px `text-muted`.

### The report card

The urgency verdict was a 12px-padded tinted strip carrying the same visual
weight as "What you've told us" three blocks below it — on a page whose entire
purpose is answering "how worried should I be". Now a solid 4px rail in the
urgency colour, a filled icon chip, and a headline one size up. Colour still
never carries the meaning alone: icon and wording do, which is what keeps it
readable for the ~8% of men who cannot separate the red and the green.

Share went from a bare text link beside a 2xl serif heading to a proper pill.
Card onto the radius rule (`rounded-xl`, surface) and the elevation scale
(`shadow-e1`, not `shadow-sm`).

### Verified

```
npm run build            Prerendered 22 static routes; sitemap 20 URLs; no NG#### warnings
npm run parity           all 22 routes match the baseline; exit 0
npm run parity:behaviour no v1 behaviour dropped
npx ng test              81 of 81 SUCCESS
```

Checked visually at 390x844 and 1280x860 in BOTH themes. /triage is not
prerendered, so none of this could move the parity baseline.

`apk:debug` NOT run — no native surface changed. The safe-area work is exactly
what wants an on-device check, though: see the still-open `KeyboardResize`
decision in `MIGRATION-NOTES`.

### Next

- The rest of /triage is swept for tokens but not redesigned: the doctors
  panel, the consult-history panel, `auth-gate`, `pin-input`, `/profile`,
  `/report-reader`. None has been looked at in a browser.
- The report card's lower half (SOAP, confidence accordion, specialist cards,
  feedback) is untouched — `ds-accordion` is still unwired and the confidence
  block is a hand-rolled one.
- seo-pages (14 routes) + legal (3). These DO move the baseline —
  `parity:snapshot -- /route` per route.
- The emergency banner still wraps to two lines below ~420px. Shortening the
  sentence is a copy decision, not a CSS one.

---

## Session 4 — UI/UX audit pass (ui-ux-pro-max Quick Reference)

The skill's `scripts/` and `data/` directories are empty in this install, so its
CLI is unavailable. Ran its Quick Reference as a REVIEW pass instead — §1
accessibility, §2 touch, §5 responsive, §6 typography/colour, §8 forms, §10
charts — measuring rather than eyeballing:

- contrast computed from the actual token values, both themes, every pair
- layout/tap/label/heading/landmark checks run in the browser per route
- a mock backend so the console UI could be audited at all

### The biggest finding was against my own Session 2 work

**`--text-muted` failed WCAG AA on every ground in light**: 3.00:1 on surface,
2.86:1 on the page ground, 2.67:1 on `--surface-2`. The value (#7D9B96) was
inherited from v1, so it predates the redesign — but Session 2 mapped ~80
console filter labels onto it and Session 3 moved the /triage legal line onto
it, which turned a handful of low-contrast timestamps into the DEFAULT for
secondary text across the app.

Darkened along its own hue so it stays the same desaturated teal-grey:

| | before | after |
|---|---|---|
| light | #7D9B96 — 3.00 / 2.86 / 2.67 | **#55736F — 5.16 / 4.92 / 4.60** |
| dark | #7D9B96 (borrowed from light) — 4.58 / 5.99 / **3.22** | **#9BB9B4 — 6.54 / 8.55 / 4.60** |

(surface / page bg / surface-2)

### The `text-ink/<alpha>` ladder had a clean cut line, and half of it failed

Computed every step against all three grounds in both themes:

| alpha | light | dark |
|---|---|---|
| /30 – /60 | **FAIL** (1.83 – 3.95) | **FAIL** (2.23 – 4.44) |
| /70 – /80 | PASS (5.09 – 7.34) | PASS (5.41 – 11.19) |

141 usages at /60 and below swept onto `text-muted` across 17 files. They were
all secondary text, which is what `text-muted` IS — and it now clears AA.

Two `text-ink/25` and one `/35` remain by design: one is an `aria-hidden`
decorative "·", and the other two are the OFF state of the dose-schedule
slots in `report-analysis-card`. That slot's LABEL was lifted to `text-muted`
though — you have to be able to read "Afternoon" to know which slot is off, and
at /35 it scored 2.3:1. The state is still carried by the "—" and the tinted
cell, and the grid already exposes the whole schedule as a sentence via
`role="img"` + `aria-label`.

### §1 skip-links: the CSS existed, nothing ever rendered it

`.skip-link` has been styled in `styles.scss` since the migration and **no
element in the app ever used it**. Keyboard users tabbed through the entire app
bar — five controls on a console, seven on /triage — on every route to reach
content.

Now rendered by `AppComponent`, with `id="main"` added to every `<main>`. It
preventDefaults and focuses rather than letting the browser follow `#main`: a
bare fragment href in a routed app is a navigation the router would strip.
Verified in the browser — reveals on focus, and activating it moves focus to
`MAIN#main`.

(Measuring it immediately after `.focus()` reports the un-revealed transform,
because `getComputedStyle` during a 150ms transition returns the interpolated
value at t=0. It works; the first measurement was wrong.)

### §1: two `<main>` landmarks could be in the document at once

/triage's doctors panel is an OVERLAY over the chat, not a replacement, so both
`<main>` elements existed together. HTML allows exactly one non-hidden `<main>`,
and a screen reader offered two "main" landmarks cannot say which one you are
in. The panel is a region — now a `<div>`.

### §1 / §8 on /triage

- **No `<h1>` at all.** The app's primary screen gave a screen-reader user no
  page heading. Added, visually hidden — the design's first line is the
  assistant's greeting, not a title.
- **The age field was labelled only by its placeholder**, which disappears the
  moment you type and is never announced as a label. Now a real `<label>`, in a
  `<fieldset>` with a `<legend>`, with `inputmode="numeric"`, `aria-invalid` and
  the error tied by `aria-describedby` + `role="alert"`.
- The sex buttons became a labelled `role="radiogroup"` with `aria-pressed`.

### §6: nothing under 12px

15 `text-[10px]` usages lifted to 11px across 9 files. Uppercase bold at 10px is
the least legible combination in the app and 11px costs nothing at badge scale.

### §4 `consistency`: the console tab pill was the wrong colour

Measured `rgb(13, 148, 136)` — teal-600 — on the selected tab of a grass-accented
console. `ds-tabs` gained a `tone` input; the three console shells pass
`tone="console"`.

**And I had introduced the opposite problem**: Session 2 gave `.console-btn*` a
GRASS focus ring while the global `:focus-visible` rule is teal, so one console
showed two different focus colours depending on whether a control had opted into
`.console-btn` or fallen through. Unified on teal. A focus indicator is a system
affordance, not brand expression — the point is that it looks the same
everywhere.

### §5: `bg-cream` was still hardcoded on four page roots

landing, ad-landing, `legal-layout` and `seo-page-layout` kept the cream ground
behind dark cards in dark mode — the same bug Session 3 fixed on /triage, just
not swept that far. `--bg` IS cream in light, so light is pixel-identical.

### Verified clean (no action needed)

- **No horizontal scroll** on any route audited, at 375px or 1280px.
- **Touch targets**: zero real violations. An early run reported dozens —
  that measurement was wrong, because Playwright reports `pointer: fine` and
  every `coarse:min-h-[44px]` from the migration's mobile pass is therefore
  INERT in the audit. Re-run excluding elements that carry a `coarse:` class:
  clean. (The 20x20 offer checkboxes are wrapped in a 904x58 `<label>`, so the
  effective target is the whole row.)
- **Icon-only buttons**: 0 without an accessible name, across every template.
- **Form labels, heading order, duplicate ids, `alt`**: clean on every route.
- **§7 reduced-motion**: already handled globally.
- **§10 charts**: the two remaining `<table class="sr-only">` are the text
  alternatives for the dashboard charts, and the dose grid uses `role="img"` +
  `aria-label`. Correct as-is.

### How the console was audited at all

The console realms need a session, and a fake token gets 401'd by the real
backend that is running on :3000. Rather than touch that backend, a throwaway
mock served the `/partner`, `/admin` and `/owner` endpoints on :3001 with
plausible fixtures, and `environment.ts` pointed at it **temporarily**.

`serverUrl` is reverted to `http://localhost:3000` and `git diff` on that file
is empty. The mock lives in the scratchpad, not the repo.

That was worth doing: it is the first time the redesigned console has been seen
rendered, in either theme, and it is what caught the teal tab pill.

### Verified

```
npm run build            Prerendered 22 static routes; sitemap 20 URLs; no NG#### warnings
npm run parity           all 22 routes match the baseline; exit 0
npm run parity:behaviour no v1 behaviour dropped
npx ng test              81 of 81 SUCCESS
contrast re-check        0 failures across 20 token pairs, both themes
```

The skip link adds text to every prerendered page but sits OUTSIDE `<main>`,
which is why parity stays green — it normalises `<main>` text only.

### Next

- `text-ink/70` (64 uses) and `/80` (18) pass AA and were left alone, but they
  are three ways of saying "body text". They want to collapse onto `text-content`.
- The offers checkboxes are raw `<input type="checkbox">`; `ds-checkbox` is
  built and still unwired.
- Not yet looked at in a browser: `/profile`, `/report-reader`, the consult
  history and doctors panels, admin-overview, partner-offers, and every console
  login page except partner's.
- Landscape and 320px were not audited. 375 and 1280 were.

---

## Session 5 — closing the audit gaps (320px, landscape, the unseen routes)

Session 4 listed what it had NOT covered. This closes that list.

Auditing 25 routes one browser navigation at a time is slow and burns context,
so the sweep runs inside a **320px-wide same-origin iframe**: load a route,
audit its document, load the next. One evaluate, many routes. Layout, tap
targets, labels, heading order, duplicate ids and landmark counts are all
measurable that way.

### 320px — 25 routes, one real finding

**No horizontal overflow anywhere.** No label, heading, duplicate-id or landmark
problems on any route. The `.seo-prose table` scroll container from the
migration holds up on `/emergency-numbers` (a 200+ row, five-column table) at
320px, which is the case it was written for.

The one finding: **`legal-layout`'s header links are 28px tall** — "Back" and
the wordmark, on `/terms`, `/privacy` and `/disclaimer`. `seo-page-layout` got
`coarse:min-h-[44px]` during the migration's mobile pass and this layout did
not. Fixed.

Its draft banner was also stock `bg-amber-100 text-amber-900`, which does not
theme-swap — now the warning role tokens.

### `/partner/campaigns` had no `<h1>`

The page opens straight into a filter bar, with an `<h2>` further down in the
drill-down view. It is the one console list page whose hero was never converted
in Session 2. Now `ds-page-header`, like its siblings.

Its filter panel was also `bg-surface/80 backdrop-blur-sm` — glass on a static,
full-width panel, which is decoration that costs a compositor layer for nothing.
Glass belongs on small fixed surfaces (redesign constraint 5). Now
`.console-panel`.

### Landscape was genuinely broken, and width breakpoints cannot express it

At **844x390** — a phone in landscape — /triage stacks an emergency banner, an
app bar, the previous-chat banner and a two-row composer around a `flex-1`
thread. The conversation itself collapsed to **~90px**: the greeting was clipped
and the age/sex card was cut off. No width breakpoint can catch this, because
844x390 is "desktop-wide".

Added a `short:` variant — `@media (max-height: 520px)` — next to `coarse:`, and
spent it on the chrome rather than the content:

| | change |
|---|---|
| emergency banner | `short:py-1` |
| app bar | `short:py-1.5` |
| "powered by KnocDoc" | `short:hidden` — pure branding, first to go |
| thread padding | `short:py-3` |
| composer | `short:min-h-[44px] short:py-2 short:max-h-28` |

Thread area went from ~90px to ~135px.

**One of those changes was wrong and was reverted before it shipped.** The first
pass also put `short:hidden` on the line under the composer — which is the
MEDICAL DISCLAIMER ("not a licensed physician… not medical advice"), not
decoration. Hiding it to win 16px of height is a compliance change dressed as a
layout one, the same mistake as toning down the emergency banner would have
been. It stays visible; only its margin tightens (`short:mt-1`).

### The console realms, seen at 320px for the first time

`/partner/{dashboard,campaigns,leads,offers}`, `/admin/{overview,leads}`,
`/owner/{home,campaigns,clinics}`, plus `/profile` and `/report-reader`: **10 of
11 clean**, the exception being the missing `<h1>` above. The `ds-table` card
views hold at 320px with no overflow.

Same method as Session 4 for auth — throwaway mock on :3001, `environment.ts`
pointed at it temporarily, reverted. `git diff` on that file is empty.

### Verified

```
npm run build            Prerendered 22 static routes; sitemap 20 URLs; no NG#### warnings
npm run parity           all 22 routes match the baseline; exit 0
npm run parity:behaviour no v1 behaviour dropped
npx ng test              81 of 81 SUCCESS
```

Audited at 320x720, 375x812, 844x390 (landscape) and 1280x900, both themes.

### Still not done

- **`short:` is applied to /triage only.** The console shells and the SEO/legal
  layouts have the same stacked-chrome shape and were not re-checked in
  landscape.
- Dark mode was verified on /triage and the owner console. The other console
  realms and the public routes were checked in light only.
- `text-ink/70` (64 uses) and `/80` (18) pass AA but are two more ways of saying
  "body text"; they want to collapse onto `text-content`.
- `ds-checkbox`, `ds-dialog`, `ds-tooltip`, `ds-accordion`, `ds-bottom-nav`,
  `ds-command-palette`, `ds-switch`, `ds-radio-group` are still unwired.
- No on-device run. The safe-area and `short:` work is exactly what wants one,
  and it ties into the open `KeyboardResize` decision in `MIGRATION-NOTES`.

---

## Session 6 — the first two unwired components, and the trap they were hiding

Session 5 left eight built-but-unwired `ds-*` components. This session wired the
two with obvious homes — `ds-checkbox` and `ds-switch` — into the six remaining
native `<input type="checkbox">` in the app.

**The tree was already ahead of the Session 5 log when this session started.**
`short:` was on all three console shells, and the `text-ink/70` and `/80`
ladders were gone (`text-ink` bare: 146 uses; `text-ink/25`: 1). That work is
not described here because this session did not do it. The gate was green on
arrival — build, `parity`, `parity:behaviour`, 81 specs — so it was taken as
the baseline.

### The bug that had been sitting in three components since they were written

The first build after importing `ds-checkbox` failed the whole compilation:

```
FatalDiagnosticError: Code: 1010, Message: Failed to resolve styles at position 1 to a string
```

with no filename. The cause is the trap `MIGRATION-NOTES` already names —
**backticks inside a `styles:` template literal** — in a CSS comment explaining
why the tick is revealed in CSS rather than with a `peer-checked:` utility:

```
/* … not with a `peer-checked:` utility … `peer-*` compiles to … */
```

The first backtick closes the string. What follows parses as expressions, so
`styles[1]` is no longer statically a string.

**It had never fired because nothing imported the file.** Angular only compiles
components reachable from the app, so all seventeen unwired components have
been sitting outside the compiler this whole time. A sweep for the same shape
found two more, both of which would have failed the moment someone imported
them: `accordion-item` (its `<summary>` marker comment) and `radio-group` (a
comment that literally cites ds-checkbox's version of the problem). All three
are fixed, each with a note saying why there are no backticks in that comment.

**Assume the remaining unwired components have never been compiled.** Wire them
one at a time and build after each; do not batch.

### Which control, where

`ds-switch` and `ds-checkbox` are not styling choices — the components' own docs
draw the line and it was applied literally: **a switch takes effect on the flip,
a checkbox is committed by a submit.**

| site | control | why |
|---|---|---|
| `/partner/campaigns` offer rows | `ds-switch` | flipping calls `updateOffer` |
| `/partner/dashboard` offer rows | `ds-switch` | flipping saves, and CREATES the offer when the row is a template |
| `/partner/offers` "Active" | `ds-checkbox` | staged, committed by "Save offer" |
| `/report-reader` consent | `ds-checkbox` | gates the "Explain my report" button |
| `/triage` document consent | `ds-checkbox` | gates the upload |
| `/triage` consent gate | `ds-checkbox` | gates "Agree & continue" |

Two API additions were needed, and both got the same treatment on both
components:

- **`<ng-content>` for the label body.** `label()` is a string, and five of the
  six sites have a badge, a price line or a link in the label. Because these
  components render the `<label>` themselves, **the caller must not wrap them in
  one** — nested labels break click targeting. The four console/consult rows
  that used to be `<label>` are now `<li>`/`<div>` with the ds-* inside.
- **`checked` as a two-way `model()`, alongside the CVA.** The console rows
  toggle a row of DATA, not a form field; pulling `FormsModule` into an OnPush
  signal page (`/report-reader`) to round-trip one boolean is the long way.
  `[(ngModel)]` and `[(checked)]` are alternatives, not a combination.
- **`disabled` split in two.** It now has an input AND `setDisabledState`, kept
  in separate signals and OR'd. Sharing one field means a CVA write clears the
  caller's `[disabled]` — and `ngModel` calls `setDisabledState(false)` on init,
  so it would have done exactly that, at the moment the row was created.

### A failed save left the control lying, in both consoles

Both offer lists bind the control to a value derived from the row
(`offerEnabled(o)`, `isOfferChecked(o)`). **Angular writes an input only when
its value CHANGED.** A rejected save leaves that value exactly as it was, so
nothing is written, and the control keeps the position the user clicked it
into — showing "attached" for an offer the server refused.

This predates the switch (the native `[checked]` binding had it too), but a
switch states its position more loudly than a checkbox, so it was fixed:

- **campaigns**: the error path replaces the row object, and `@for (…; track o)`
  remounts the row against the truth.
- **dashboard**: the error path refetches. Template rows are not in `offers` at
  all, so replacing an object would not have covered them.

`/report-reader`'s `toggleConsent()` also negated its own signal to work out the
new value. It takes `$event` now — the control has already decided what it is,
and deriving it a second way is how two sources of truth drift apart.

### The consent gate's links were ticking the consent box

`/triage`'s consent copy has "Terms of Use" and "Privacy Policy" inside the
label. Clicking either opened the tab AND activated the label, silently ticking
the box the user had not agreed to. Pre-existing, and not cosmetic: it is a
consent control. Both anchors now `stopPropagation()`.

### First component specs in the project

Everything tested here until now was a service, a route table or a util. These
two controls each have two ways to be driven over one shared internal signal,
which is precisely the thing that fails silently, so they got specs: ngModel
round-trip, `[(checked)]` round-trip, `[disabled]` surviving `setDisabledState`,
and one `<label>` with the projected content inside it.

Two of them failed on the first run and both were the spec being wrong, not the
component:

- `ds-icon` throws on an unregistered icon rather than rendering nothing
  (hard constraint 6), and a `TestBed` is a bootstrap — it needs
  `provideIcons()` like the app's does.
- A test asserted the switch re-syncs when the caller writes back an UNCHANGED
  value. It cannot, for the reason above. That assertion is now inverted into a
  test that pins the limit and names the two call-site fixes, so the next person
  to bind `[checked]` finds it.

`NgModel` also defers its write to a microtask: `detectChanges()` →
`whenStable()` → `detectChanges()`, or the assertion reads the pre-write DOM
and passes for the wrong reason.

### Verified

```
npm run build            Prerendered 22 static routes; sitemap 20 URLs; no NG#### warnings
npm run parity           all 22 routes match the baseline; exit 0
npm run parity:behaviour no v1 behaviour dropped
npx ng test              90 of 90 SUCCESS  (81 + 9 new)
```

`parity` is untouched by design: all six sites are on noindex routes that are
never prerendered. `parity:behaviour` is what covered them, and it is clean.


### Reported mid-session: `/report-reader`'s sign-in stuck on "Please wait…"

Found by using the app, not by the gate — every check was green while this was
broken. Worth reading as a limit of the gate: `parity` sees prerendered HTML
only, `parity:behaviour` compares endpoint/analytics/route/storage NAMES, and
the specs do not mount `/report-reader`. Nothing in that set can see a view
that never re-renders.

`POST /user/numCheck` returned 200 with the right body. The button never moved.

`AuthGateComponent` is Default strategy and mutates plain fields (`busy`,
`authStep`) from its HTTP callbacks — it is one of the ~58 handlers constraint 2
is about. `triage-shell` is Default too, so the gate has always worked there.
**`/report-reader` is OnPush** (`report-reader.component.ts:37`), a new 2.0
page written over signals. Zone-based CD ticks the whole app when the XHR
lands, the tick skips the clean OnPush page, and the child underneath is never
reached. `busy` was already `false` in memory.

Fixed in the CHILD, not by dropping the page's OnPush — the gate should work
under any host, and dropping OnPush fixes one page and leaves the next one to
rediscover this. `auth-gate` and `pin-reset` now inject `ChangeDetectorRef` and
call a private `rendered()` after every async boundary, each with a comment
saying why. `pin-reset` had it too and would have frozen the whole forgot-PIN
flow on the same page; its 60s resend `setInterval` is on the list as well — a
timer tick is an async boundary like any other, and it was counting down
invisibly.

`report-reader`'s own async state is all signals, so the page itself was fine.

A sweep of every OnPush component's template against its Default children
(matching `subscribe`/`await`/`setInterval` blocks that assign `this.x =`)
reports **zero remaining pairs**. The other 17 Default-with-async components
are routed pages under the non-OnPush `AppComponent`, or children of Default
hosts — correct as they stand, and exactly what constraint 2 describes.

Recorded as a trap in `MIGRATION-NOTES` ("An OnPush page may not host a Default
component that mutates fields async"), because the rule as written there read
as being about one component when it is really about the pair.

**Still not verified in a browser** — same reason as above. Re-test the flow on
`/triage/report-reader`: enter a number, and confirm the button leaves "Please
wait…" and the district prefills from GPS.


### The prescription readout, made readable for the person taking the tablets

Three changes to `report-analysis-card`, all aimed at one reader: someone
holding a prescription they cannot decode.

**"1-0-1" was reaching the screen verbatim.** The API's `frequency` is whatever
the prescription said, and prescriptions say it in code. A new
`plainFrequency()` translates the two families that actually turn up — the
`x-x-x` slot notation (count the non-zero positions) and the latin
abbreviations (`OD`, `BD`, `TDS`, `QID`, `HS`, `SOS`, `PRN`) — and DROPS
anything else that is pure notation, falling back to the wording already
derived from the slots. Nothing here invents a frequency; every branch restates
what was written, and the verbatim line sits right under it either way.

**The frequency chip now only appears when there is no slot grid.** With a grid
above it, "Twice a day" was the third statement of one instruction in a single
card (grid, chip, verbatim line) and the one the reader had least reason to
stop on. The duration chip is the opposite — "For 5 days" appears nowhere else
and is the part people get wrong — so it stays, and gained the weight the
frequency chip gave up.

**The day-at-a-glance grid is one divided block, not four cards.** Every slot
used to be a filled box, so a typical two-dose prescription drew four boxes
where two carried information and the reader had to check all four to find
them. Lit slots keep the tint and now carry the dose at 15px; unlit slots
recede to a muted label and dash.

**The first attempt at that was wrong and was fixed before it shipped.**
Removing the box from unlit slots left the tinted ones floating at ragged
positions in the 2x2 phone layout — it read as a rendering bug. Making the four
cells a single `divide-x`/`divide-y` block restores a shape that is identical
for every medicine, so the tint is the only thing that varies, which is the
only thing that means anything. **That was only visible by looking at it.** The
gate was green for both versions.

Nothing in the uncertainty warning was touched. It is the loudest thing in an
unverified card and should be.


#### Second pass: the same card at half the height

The first pass was reviewed against a five-medicine prescription and the verdict
was that it had optimised the wrong axis. Recorded plainly because the mistake
is instructive:

- The four-slot strip gave equal, full-width space to every time of day whether
  a medicine used one dose or four. Making it "one tidy divided block" fixed how
  RAGGED it looked and nothing about how BIG it was.
- The dose text was made LARGER (13px to 15px) inside the very block that
  needed shrinking.
- "WHEN TO TAKE IT" repeated on every card, saying nothing new after the first.
- The uncertainty warning was deliberately left alone, on the reasoning that a
  safety message should stay loudest. That protects the message's CONTENT but
  not its DELIVERY — the identical 25-word sentence on every unread medicine is
  how a warning stops being read. "Do not weaken it" and "do not restructure
  it" were treated as the same rule; they are not.
- No icons were added to a card that is entirely about times of day and meals.

What the card is now, per medicine: a name row, ONE meta line, the verbatim
line, and (only when uncertain) the candidate name. Roughly 110px against 250px.

| was | is |
|---|---|
| section label + 4-cell full-width table + 2 chip rows + food line | one wrapping meta line |
| four equal cells, mostly dashes | icon strip: lit slots say their name, dim slots are the icon alone |
| dose repeated in every cell | dose stated once, beside the strip |
| full warning sentence per unread medicine | one banner for the document + a CHECK chip and the candidate name per medicine |

Decisions inside that worth keeping:

- **All four slots still render, always.** The icons are the arc of a day —
  sunrise, high sun, sunset, moon — and only read as a day when the whole arc is
  present. Drop the empty ones and the rest become decoration.
- **Lit slots carry their WORD, dim slots do not.** Sunrise and sunset are
  near-identical at 15px and morning-vs-evening is the one confusion that
  matters. The slots being claimed say which they are; the empty ones have
  nothing to be confused about. `title` and the container `aria-label` carry the
  labels either way.
- **The dose is one value for the whole medicine**, so printing it in each lit
  chip AND beside the strip said "5 ml" twice about one spoonful. Strip answers
  WHEN, the text answers WHAT.
- **A food detail is shown only when it adds a FACT.** "Before food — about 30
  minutes before the meal" and "On an empty stomach — before eating or drinking
  anything" earn their line. "After food — soon after the meal" restates its
  own label and became a `title`. That is what `showDetail` on the food object
  encodes, and it is a content judgement, not a layout one.

Two things caught in self-review before rendering, both violations of rules this
repo already had:

- `pl-8.5` is not on Tailwind's spacing scale and would have silently compiled
  to nothing. It is `pl-[34px]` — the 24px badge plus the 10px gap.
- The new chips were uppercase bold at 10px, which is exactly the combination
  Session 4 swept out of the app ("nothing under 12px" — 15 usages lifted to
  11px). They are 11px.

And one caught after rendering: `doseShort` / `shortDose()` were added for chip
counts, then made dead by the decision to show labels instead. Removed rather
than left as a helper nothing calls.

**Needs sign-off — safety copy.** The uncertainty warning now reads once per
document, in the plural ("The medicines marked below were hard to read…"),
instead of once per medicine in the singular. Same clauses, same claim, one
occurrence. If that is not acceptable for compliance, restoring the per-card
sentence is a small revert to the block above the `catalogueName` line.

Verified with the same headless-Chrome harness, at 430 and 840 wide, light and
dark, on a five-medicine mock (an `x-x-x` frequency, a night-only, a legible
`TDS`, an afternoon-only, and a `5 ml` syrup to exercise the non-countable dose).

#### How it was looked at, given no browser tooling connected

The Chrome extension is not connected and the playwright MCP times out, and
Playwright is not a dependency of this project. Chrome headless is already on
the machine (karma runs the specs through it), so:

- a throwaway `/triage/__rx-preview` route mounted the REAL component with
  three mock medicines — an `x-x-x` one, a night-only one, and a legible `TDS`
  one — which beats hand-copying markup into a static harness that can drift
  from the template;
- `chrome.exe --headless=new --screenshot` against the dev server at :4700, at
  phone and desktop widths, plus `?theme=dark` on the harness for dark mode;
- harness and route then deleted — `git diff` on `triage.routes.ts` is empty.

Two things to know if you repeat this: the headless window size is ~40px wider
than the viewport it screenshots, so the right edge looks cropped at narrow
widths when the layout is fine; and `--virtual-time-budget` has to be generous
or the shot lands before the lazy route has painted.

Dark mode verified on this card (the tint, dividers and warning ink all swap
correctly) — which closes a little of the gap listed above, for one card only.


### Everything on the page that is not a medicine

Asked for: the number of days each medicine runs, a follow-up date, "basically
all details in human readable format".

**The duration was already there** — the card has shown "For 5 days" since the
compaction pass, and `duration` has been in the contract all along. Worth
confirming the EXTRACTOR fills it, because it is often left inside `howToTake`
where the card has to parse it back out (`parseDuration`).

**Everything else was genuinely missing, and not from the card — from the
CONTRACT.** An audit of `ReportAnalysis` against the template found the card
already renders every field the model carries: headline, findings,
whatThisMeans, whatToDo, questionsForYourDoctor, urgency, urgencyReason,
legibility, notInterpreted, medicines. There was no gap to close in the view.
The model simply has no follow-up date, no diagnosis, no advised tests, no
general advice, no prescription date and no prescriber.

So the contract grew a `PrescriptionDetails` block and the card renders it:

- **above the medicines** — what the prescription is FOR, and which piece of
  paper this is (`diagnosis`, `prescribedOn`, `prescriber`). A patient who
  cannot read the diagnosis cannot tell whether the page in their hand is even
  the right one.
- **below the medicines** — "Also on this prescription": the follow-up first
  (tinted, its own row), then tests, then non-medicine advice. The follow-up
  leads because it is the most missed instruction on any prescription and the
  only one with a deadline that announces nothing: a course of tablets ends when
  the strip runs out, a review date passes in silence.

`followUpPhrase()` supplies the preposition the row needs — "after 5 days" is
left alone, a bare date becomes "on 12 September" — because the backend returns
whatever the page said and the two shapes do not read the same after "Go back
to the doctor".

**The backend does not send any of this yet**, so today the block renders as
nothing. That is the designed behaviour, not a stopgap: every field is
optional, and an absent one renders no heading, no empty row and no
placeholder. An empty "Next visit" would be read as "no follow-up needed",
which is a claim about someone's care that we cannot make. Verified both ways
against the harness — with the fields, and with the `prescription` object
omitted entirely, which is what every previously stored analysis looks like.

`BACKEND-PRESCRIPTION-FIELDS.md` at the repo root has the JSON shape and the
rules that matter (omit what you cannot read; keep the page's own phrasing for
the follow-up; lists stay lists).

**A note on the harness, for next time:** the dev server on :4700 served a stale
bundle for several minutes and two screenshots were taken of the OLD component
before this was noticed — the giveaway was medicines in the shot that the new
mock does not contain. `npm run build` compiled the same source cleanly, which
is what ruled out a compile error. Starting a second server on a free port was
faster than diagnosing the first. **Check a screenshot contains something only
the new code could produce before trusting it.**

### The report-reader card now has a window, not a permanent slot

It used to render on `!emergency && !report && !showUploadPanel && messages.length <= 1`,
which put it directly beneath the age/sex card — two things asking for
attention on a screen whose whole job is to get one answer.

It now shows in exactly one window: AFTER the age/sex answer, BEFORE the first
symptom. `showReportEntry` on the shell, derived from state that already
exists rather than a new flag:

```ts
if (emergency || report || showUploadPanel || showConsent) return false;
if (!ageSexDone) return false;                                   // near edge
return messages.filter((m) => m.role === 'user').length <= 1;    // far edge
```

The far edge works because `pickAgeSex()` SENDS its answer as a user message —
so one user message means "age/sex only", and two means a symptom was typed.
The door closes on the same tick the message is appended, before any reply
comes back. No flag to keep in sync, and no `symptomStarted` boolean to reset
in the two places that start a fresh chat.

It also handles the case that would have needed special-casing: someone who
types a symptom WITHOUT answering age/sex never sees the card, because
`ageSexDone` is false for them. Right answer, right reason.

`showConsent` is in the guard because for an anonymous visitor the consent gate
opens immediately after the age/sex submit, and a second door beside a consent
gate is the worst place for one.

A line under the card says the card is optional — "Or just type your symptom
below — that works too." A card with a chevron on an otherwise empty screen
reads as the way forward, and the consult, not the upload, is the main path.

#### Driving a real flow with no browser tooling

Screenshots were not enough here — the requirement is about a SEQUENCE. The
Chrome extension is not connected and the playwright MCP still times out, so
Chrome was driven over CDP directly: `--remote-debugging-port=9222`, and a
~60-line Node script (`WebSocket` is global in Node 22, no dependency) doing
`Runtime.evaluate` to click and type, and `Page.captureScreenshot` between
steps. Recorded because it is reusable for anything interactive.

Verified, from a cleared `localStorage`:

| step | age/sex card | report card | hint line |
|---|---|---|---|
| opening screen | shown | **hidden** | – |
| age/sex answered, consent accepted | gone | **shown** | **shown** |
| symptom typed | gone | **hidden** | – |

**The first run of that script gave a false negative and the script was the
thing at fault.** It typed a symptom while the consent gate was still up; the
shell holds that text in `pendingText` and replays it once consent is accepted,
so the run skipped the window entirely and reported the card as never showing.
Worth remembering when driving this screen: consent queues input, so a script
that types before consenting is testing a different flow than it thinks.

That run did confirm something else for free: **the `ds-checkbox` consent gate
renders correctly** — one label, projected copy with working links, real
checkbox — which was on the "not visually confirmed" list from the wiring pass.

### Still not done

- **No visual confirmation of the `ds-checkbox` / `ds-switch` work.** The
  prescription card above WAS looked at, through the headless-Chrome method
  described there — the same method is available for these and was not spent on
  them. The specs cover behaviour and structure; they say nothing about how the
  switch rows or the restructured consent cards LOOK, and the console rows went
  from `<label>` to `<li>` with the padding moved. **Look at
  `/partner/campaigns`, `/partner/dashboard` and `/report-reader` before
  trusting this session. The `/triage` consent gate HAS now been seen — see the
  CDP run above.**
- Six components still unwired: `ds-dialog`, `ds-tooltip`, `ds-accordion`,
  `ds-bottom-nav`, `ds-command-palette`, `ds-radio-group`. Expect at least the
  compile-on-first-import problem above; build after each one.
  - `ds-accordion` has an obvious home (the FAQ blocks on the landing and SEO
    pages) but those ARE prerendered, so it needs the review-then-
    `parity:snapshot` route, one route at a time.
- Carried from Session 5, untouched here: dark mode still verified on /triage
  and the owner console only; `short:` still unchecked on the SEO/legal
  layouts; no on-device run.
