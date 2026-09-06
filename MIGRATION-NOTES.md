# DoctoGuide 2.0 — migration notes

Angular 14 → 19 rebuild of `AIDoctorFront`, with a Capacitor Android target.
The migration froze functionality: same pages, same routes, same endpoints.
Only the framework, styling system and libraries changed.

**That freeze is over.** The migration is complete and signed off, and the
2.0 redesign (see `## Redesign` at the bottom) deliberately changes copy,
structure and layout on the public routes. What follows describes how the port
was done and which of its decisions are load-bearing — read it before changing
anything it explains, but do not read it as a rule that the app must still look
like v1.

Baseline for parity: `../doctoguide-v2-baseline/` — a snapshot of reviewed 2.0
prerender output, advanced one route at a time with `npm run parity:snapshot`.
The v1 baseline it replaced (`../doctoguide-baseline/`, v1 prerender output,
HEAD `2795811`, documented by `MIGRATION-BASELINE.md` in that folder) is kept on
disk for reference but nothing reads it any more.

## Verify (run all five after any change)

```bash
npm run build            # gates on prerender drift; must say "Prerendered 22 static routes"
                         # and "sitemap.xml written with 20 URLs". Must emit NO NG#### warnings.
npm run parity           # all 22 prerendered routes match the CURRENT baseline; exit 0
npm run parity:behaviour # v1 -> v2: endpoints / analytics / routes / storage keys; exit 0
npx ng test --watch=false     # 90 specs
npm run apk:debug        # -> android/app/build/outputs/apk/debug/app-debug.apk
```

`parity` only sees prerendered HTML, so it covers the 22 public routes and
NOTHING else — /triage and the three console realms are noindex, never
prerendered, and therefore crossed the migration unchecked. `parity:behaviour`
is what covers them. It needs v1 checked out at `../AIDoctorFront`.

**`parity` no longer asks "does this still match v1".** It asks "did anything
move that I did not mean to move". When you deliberately redesign a public
route, review the new output and advance the baseline for that route only:

```bash
npm run parity:snapshot -- /about        # one route
npm run parity:snapshot                  # all 22 (rare — usually a mistake)
```

Every route you did NOT snapshot keeps failing on any change, which is what
catches the real accident: editing the landing page and silently moving five
SEO pages' metadata with it.

**`parity:behaviour` is NOT retired and must stay green through the redesign.**
It pins endpoints, analytics event names, route paths and `localStorage` keys.
The redesign changes markup and CSS — never a URL, an event name or a storage
key. If a redesign commit turns that script red, the commit is wrong, not the
script.

Also confirm no realm leaked into the prerender:
`dist/doctoguide/browser/{admin,owner,partner,triage}` must NOT exist.

## Decisions still needing sign-off

1. **`district` in signup payloads.** v1 had an uncommitted change adding
   `district` to `POST /user/setPin` and `POST /user/signup`. Ported as-is —
   the working tree was the latest intent and the Phase-0 baseline was built
   with it. Pinned by a spec in `ai-doctor-api.service.spec.ts`. One-line
   revert if unwanted.

2. **Keyboard resize mode.** `capacitor.config.ts` sets
   `KeyboardResize.None`, so the Android keyboard OVERLAYS the WebView instead
   of shrinking it. The triage composer is the last row of a `100dvh` flex
   column, so under `None` the keyboard should cover the very control the user
   just focused. `native` (the Capacitor default) resizes the WebView and lets
   the flex column reflow above the keyboard, which is what this layout wants.
   NOT CHANGED: the current value is a deliberate note in that file claiming
   resize "pushes the chat thread off-screen", and only an on-device run can
   settle which is true. **Test this on a device before shipping the APK** —
   type into the composer and confirm it stays visible.

## Added for the APK (no web equivalent — an addition, not a port)

`core/native/back-button.service.ts`. Android hardware back: close overlay →
`history.back()` → double-press-to-exit. Without it Capacitor exits the app on
the first press, mid-consult. Inert in a browser.

Wired: `triage-shell` registers one closer (`closeTopOverlay()`) in `ngOnInit`
and unregisters it in `ngOnDestroy`. It closes, in stacking order, the leave
dialog → auth gate → history panel → doctors panel → drawer. The consent card
is deliberately NOT in that list: it is an inline step in the thread, not an
overlay, and dismissing it with `back` would skip a consent gate.

## Known, accepted differences from v1

- `/` body text is ~198 chars shorter. PrimeNG's carousel ran in circular mode
  and cloned the first and last hero slides into the DOM, so the baseline
  contains two slides twice. `ds-carousel` keeps each slide once; all six are
  still crawlable. Recorded in `scripts/parity-diff.mjs`.
- Material ligature names (`arrow_forward`, `chat_bubble_outline`) no longer
  appear in page text. v1 was leaking icon names into its own indexable copy.
- ~~`font-display` was a serif (Fraunces) and is now Clash Display.~~ REVERTED.
- ~~`font-extrabold` (800) now synthesises.~~ REVERTED — Outfit's real 800 is back.
  See "Typography restored to v1" below.

## Deferred (deliberate — do after parity sign-off, as reviewed commits)

- ~~Sub-44px tap targets~~ — DONE, see "Mobile pass" below.
- ~~Dead alpha classes~~ — **the claim was wrong, nothing to do.** Tailwind 3
  generates an opacity modifier for ANY numeric value; the `theme.opacity`
  scale only bounds the *suggestions*, not what compiles. `text-teal-900/45`,
  `/55` and `/15` are all present in `dist/doctoguide/browser/styles-*.css`.
  Verify with: `grep -o 'text-teal-900[^{,]*' dist/doctoguide/browser/*.css`.
- **Clash Display 700 preload** — RESOLVED, keep it. The landing hero above the
  fold uses `font-bold` (700) and `font-extrabold` (which synthesises from
  700), so both preloaded faces are on the first-paint path.

## Mobile pass (post-parity)

Parity compares `<title>`, the meta block and the normalised `<main>` TEXT — not
class attributes or CSS — so everything here left all 22 routes matching.

- **iOS focus-zoom.** 51 raw form controls were `text-sm` (14px), including the
  triage composer, the auth gate and every console filter. iOS Safari zooms the
  viewport on focus below 16px and does not zoom back out on blur. One rule in
  `styles.scss` raises the floor to 16px under `@media (pointer: coarse)`; the
  desktop consoles keep their denser 14px.
- **44px tap targets.** 69 controls were under 44px. Each gained
  `coarse:min-h-[44px]` (plus `coarse:inline-flex coarse:items-center` where an
  `<a>` was inline and min-height would have been inert). `coarse:` is a custom
  variant registered in `tailwind.config.js` — Tailwind 3.4 has NO `pointer-*`
  variants, those arrive in v4. Keyed on pointer type, not a width breakpoint:
  a phone in landscape is still a finger, a narrow desktop window is still a
  mouse. Desktop rendering is unchanged.
- **Sideways page scroll on `/emergency-numbers`.** A five-column, 200+ row
  country table sat in prose with no scroll container, so the PAGE scrolled
  horizontally. `.seo-prose table` becomes its own scroll container under
  640px. CSS only — the prerendered HTML is byte-identical.
- **The composer had no accessible name.** The send button is icon-only, and the
  textarea's only label was a placeholder that rotates through three languages
  every 4s. Both now carry a static `aria-label`.
- **jsPDF moved off the chat route.** `report-pdf.service` is constructor-
  injected into `triage-shell`, so its static `import { jsPDF }` put the whole
  PDF stack in the chat chunk — paid for by every consult, used only by those
  who tap Download. Now a dynamic `import('jspdf')`, which makes
  `downloadReport` / `downloadSoap` async (the two call sites `.catch()`
  instead of `try`/`catch`). **triage-shell chunk: 529.8 kB → 117.1 kB raw,
  138.5 kB → 25.8 kB transferred.**

## Error handling in /triage

- The turn that fails now says WHICH failure it was — offline, unreachable, 429,
  5xx — because "something went wrong" is the same sentence whether the user
  went through a tunnel or the backend is down, and only one of those is worth
  retrying immediately. `describeError()` in triage-shell.
- **A failed send no longer costs the user their text.** `lastFailedText` holds
  the turn and a "Try again" chip resends it verbatim. Cleared on the next
  successful turn.
- **A failed session create no longer sends the message anyway.** `ensureSession`
  used to call `done()` on error, and `dispatchToSession` then read
  `this.state.sessionId!` — a non-null assertion on a value that was null. That
  posted `sessionId: null`, guaranteeing a second failed round-trip and a second
  error for one user action. `ensureSession` now takes a `fail` callback.
  Verified: one dead-backend send produces one console error, not two.

## Control-flow migration (`*ngIf` / `*ngFor` → `@if` / `@for`)

The schematic's output needed two corrections it cannot make itself:

- **`track` on arrays of strings.** The schematic emits `track <item>`, which
  turns a legal duplicate VALUE into a duplicate KEY. `*ngFor`'s default
  identity trackBy tolerated that; `@for` warns (NG0955 in dev) and, worse,
  reconciles the list wrongly when it changes. Every string array — LLM-written
  report bullets, SOAP lines, answer chips, console filter options — is now
  `track $index`.
- **`track` on arrays rebuilt every change detection.** The SOAP block iterates
  an object literal built inline in the template, and `specialists` /
  `otherSpecialists` are getters returning fresh arrays. Tracking by identity
  destroyed and recreated those subtrees on every CD pass. Now tracked by
  `s.label` / `s.specialty`.

Also cleared 11 `NG8107` warnings ("unnecessary `?.`"). The `?.` was correct —
these are API-response fields and every TS reader already guards with `|| []`.
The interfaces were the thing lying, so the fields are now optional in
`{triage,partner,admin,owner}` models rather than the guards being deleted.

## Behavioural parity result (v1 -> v2, unprerendered surface)

Run at migration-audit time, all clean:

| | v1 | v2 | |
|---|---|---|---|
| HTTP endpoints | 35 | 35 | identical |
| Analytics events | 15 | 15 | identical |
| Route paths | 47 | 47 | identical |
| localStorage keys | 19 | 20 | all 19 preserved; v2 adds `doctoguideTheme` |

All 19 keys keeping their v1 names is what stops the deploy from logging every
existing web user out — same origin, same keys, sessions and logins survive.

A member-level diff of the 72 paired `.ts` files found 14 members in v1 with no
v2 counterpart. Every one is explained by the framework move, not lost work:
`canActivate` x3 (class guards -> functional), `intercept` (class interceptor ->
functional), `enableProdMode` / `platformBrowserDynamic` (-> `bootstrapApplication`),
`app.component`'s manual `ngOnDestroy`/`sub` (-> `takeUntilDestroyed`),
`trackByIndex` (-> `@for`'s `track`), and `looksGibberish` (moved verbatim into
`triage-view.util.ts`, where it finally has specs).

Two v1 components have no v2 counterpart and correctly do not: `profile-edit`
and `typing-animation` are DEAD CODE in v1 — neither selector appears in any
v1 template. Not a dropped feature.

## Typography restored to v1

v2 had repointed all four font families at Clash Display, collapsing a
four-voice system into one and turning the serif hero into a sans. That is now
reverted: the app renders the same faces as doctoguide.knocdoc.in.

| role | class | face |
|---|---|---|
| body, buttons, links | `font-body` | DM Sans |
| headings, wordmark | `font-heading` | Outfit |
| hero + SEO ledes | `font-display` | **Fraunces** (serif) |
| console display | `font-grotesk` | Space Grotesk |

Verified against production by computed style, at both 375px and 1265px, for
`h1` / lede / `h2` / `body` / `button`: family, size, weight and line-height are
an exact match at every sample point.

**Self-hosted, not `<link>`ed like v1.** The APK must render text with no
network. One VARIABLE woff2 per family per subset, so `font-weight: 400 800`
interpolates every weight rather than shipping a file each — 9 files, 156 KB for
`latin`. `latin-ext` is gated behind unicode-range and normally never downloads.
This is also faster than production, which pays DNS + TLS to BOTH
fonts.googleapis.com and fonts.gstatic.com before a glyph paints.

Two things that had to be undone to get an exact match, both worth knowing:

- **Do not set `font-weight` or `line-height` on the global `h1-h6` rule.**
  Tailwind's Preflight resets headings to `font-size: inherit; font-weight:
  inherit`, and v1 depends on it — every heading's size and weight comes from
  the utility classes on the element. A global weight silently re-weighted every
  heading in the app; the Fraunces hero rendered at 700 where production is 400.
  The rule now sets family and colour, nothing else.
- **No `fontSize` or `letterSpacing` overrides in tailwind.config.js.** v1 uses
  the stock Tailwind scale, so every ported template was written against stock
  metrics. v2's custom scale (14px/1.55 vs 14/20, 18px/1.6 vs 18/28,
  `tracking-tight` at -0.011em vs -0.025em) made every line 1-2px looser than
  production across 129 `tracking-*` usages. Nothing looked broken, which is
  exactly why it survived.

## Traps worth remembering

- **NEVER put `ChangeDetectionStrategy.OnPush` on `AppComponent`.** It was added
  during the port (v1's AppComponent was Default) and it silently broke every
  async render in the app.

  `ApplicationRef.tick()` walks from the root view and STOPS at a clean OnPush
  view, skipping its whole subtree. Every feature component renders under
  AppComponent's `<router-outlet>`, and they are Default-strategy ports from v1
  that mutate plain fields (`this.loading = false`, `state.messages.push(...)`)
  and never call `markForCheck()`. So only a DOM EVENT could repaint them —
  Angular's event handling marks the tree dirty on the way up — while anything
  driven by an async callback updated state that never reached the screen.

  How it presented: with the backend down, sending a message in /triage left the
  user looking at their own bubble and nothing else, forever. It looked like
  missing error handling. It was not: `state.messages` DID contain the error and
  `loading` WAS false. Typing one more character made the message appear.

  Diagnosing this: if state is right and the DOM is stale, check CD, not the
  handler. `ng.applyChanges($0)` in the console rendering it instantly is the
  tell. Do not chase the HTTP layer — `withFetch()` and zone leaks look like
  plausible culprits and are a dead end here; the backend was already
  `_HttpXhrBackend` while the bug persisted.

  Re-adding OnPush means auditing ~58 async handlers across 21 files for
  `markForCheck`, or moving the app to signals. AppComponent's template is a
  bare `<router-outlet />` — OnPush saves nothing there.


- **`lucide-angular` THROWS on an unregistered icon name.** The throw aborts the
  surrounding component's whole update pass: every binding renders empty and
  `@if`/`@for` collapse, while the static DOM still serializes — so a prerender
  "succeeds" with a blank page. `ds-icon` now falls back to a neutral dot.
  Three ligatures (`forum`, `money_off`, `alt_route`) hit this; they came from
  TS data arrays, not template spans, so a grep for `material-icons` missed them.
- **`outputMode: "static"` silently ignores `prerender.routesFile`** and
  prerenders every discoverable route — including the noindex console realms.
  Do not reintroduce it.
- **`ng add @angular/ssr` injects `provideClientHydration`.** It must stay out:
  v1 prerenders then re-bootstraps destructively, and landing's
  `isBrowser`-gated getters render differently on server vs client.
- **`cap sync` does not add Android permissions.** The location permissions in
  `AndroidManifest.xml` are hand-added; without them geolocation silently
  returns null in the APK.
- **Disk.** `.angular/` (build cache) reached 8.6 GB over ~20 prerender builds
  and filled C:, which surfaced as karma "No space left on device". `.angular/`
  and `dist/` are both safe to delete.

---

# Redesign

The migration is done. What follows is the 2.0 redesign: a mobile-first,
glassmorphic pass over an app that is currently a competent port of a 2019-era
UI with tap targets fixed.

Two things the brief assumed are already true and need no work:

- **PrimeNG is gone.** Not a dependency, not in `node_modules`, zero usages.
  `p-dropdown` → `ds-select`, `p-calendar` → `ds-date-field`, `p-carousel` →
  `ds-carousel`, `mat-sidenav` → `ds-drawer` all happened during the migration.
  The only remaining traces are the explanatory comments on those components.
- **A design system exists** at `src/app/design-system/` — 15 standalone, OnPush,
  signal-API components over a real token bridge. The redesign extends it; it
  does not replace it.

## Decisions

| Decision | Choice |
|---|---|
| v1 parity gate | Retired. See `## Verify` above for what replaced it. |
| Typography | Unchanged — the 4-family stack stays (see "Typography restored to v1"). |
| Angular CDK | Installed, `a11y` + `overlay` only. Never a barrel import. |
| Dark mode | Shipped. `ThemeService` gets a UI. |

## Constraints the redesign must not break

1. `npm run parity:behaviour` stays green. Markup and CSS change; a URL, an
   analytics event name or a `localStorage` key does not.
2. `AppComponent` stays non-OnPush. The comment at `app.component.ts:12` is
   load-bearing — ~58 async handlers across 21 feature components mutate plain
   fields with no `markForCheck`. New `ds-*` components are OnPush + signals,
   which is safe because they own their own state. Do not opportunistically
   convert feature components.
3. Everything prerenders with no browser. New overlays must not touch
   `document` during construction — guard with `afterNextRender` /
   `isPlatformBrowser`, the way `ThemeService` already does.
4. Bundle budgets: 700 kB initial warn, 1.2 MB error, 8 kB per component style.
5. `backdrop-filter` on a large scrolling surface janks in the Android WebView.
   Glass belongs on small, fixed, compositor-friendly surfaces only.

## Radius scale — the rule

The scale (`sm 8 / md 12 / lg 16 / xl 20 / 2xl 28`) existed but was applied
ad hoc. From here:

| Use | Radius |
|---|---|
| Control (input, select, textarea, icon button) | `rounded-lg` |
| Surface (card, panel, list row) | `rounded-xl` |
| Sheet, dialog, drawer | `rounded-2xl` |
| Pill (button, badge, chip, tab) | `rounded-full` |

Applied as components are touched, not as a sweeping find-and-replace.

## Console ROLE tokens — the same rule as the brand roles

The three console realms had no dark mode: they were painted in `sand-*`,
`stone-*` and stock Tailwind `amber-*`, none of which is redefined under
`[data-theme="dark"]`. `ThemeService` has a UI now, so that was reachable.

The fix is the rule already established for the teal ramp (see "Brand ROLE
tokens" in `styles.scss`): **the ramp's ENDS become named roles; the mid-ramp
FILLS stay palette steps.** A fill is correct unchanged in dark — `bg-grass-600`
under white text, `ring-grass-500` on a focused control — while the same step
used as ink or as a tint surface has to invert.

| role | light | dark |
|---|---|---|
| `console-ink` / `-soft` | grass-700 / -600 | grass-300 / -400 |
| `console-tint` / `-strong` | grass-50 / -100 | grass-800 / -700 |
| `console-line` | grass-200 | grass-600 |
| `console-gold` / `-soft` | amber-700 / -600 | amber-300 / -400 |
| `console-gold-tint` / `-strong` / `-line` | amber-50 / -100 / -300 | amber-950 / -900 / -800 |

`console-gold` is the console's SECOND accent — the promo colour on offers,
campaign bars and "limited time" chips. It is a role for the same reason.

**A dark slab is not a role.** `bg-stone-900` on the two console login heroes,
the owner wordmark tile and the campaign summary card is a panel that must stay
dark in BOTH themes because it carries white text. It is `bg-grass-900` — a
palette step, therefore theme-invariant. Mapping it to `ink` (which flips to
near-white) would have put white text on a white slab.

## `ds-tabs` has two modes, and the console shells use the routed one

`TabItem.link` turns the strip into `<a routerLink>` tabs. A console section IS
a URL: a `<button>` cannot be middle-clicked into a new tab, copied as a link,
or previewed in the status bar.

Two consequences that are deliberate, not oversights:

- **Arrow keys move focus only on a routed strip** (WAI-ARIA manual activation).
  Automatic activation would fire a route change per keypress, so arrowing from
  the first section to the fourth mounts and destroys two whole views on the
  way. Enter follows the link, which is what the anchor already does.
- **`active` is an input the caller derives from the URL**, not something the
  component works out. `routerLinkActive` cannot serve here: `ds-tabs` needs the
  ID for `aria-selected` and to scroll the strip, and a class tells it neither.
  The shells derive it with `toSignal(router.events … startWith(null))` — the
  `startWith` is what makes a deep link select the right tab instead of only the
  first in-app navigation doing so.

## The console shells scroll the PAGE, not a nested `<main>`

All three were `min-h-[100dvh] flex flex-col` with an `overflow-y-auto`
`<main>`. Nothing ever passed under the header, so glass on it would have been
decoration, and the console had two nested scroll regions. Now the document
scrolls and the app bar is `sticky top-0 z-nav glass-2` with `pt-safe-t`;
`<main>` carries the bottom safe-area padding.

## `.console-*` classes

`.console-label`, `.console-field`, `.console-panel`, `.console-btn`,
`.console-btn-outline`, `.console-btn-ghost` in `styles.scss` `@layer
components`. They exist because a ~220-character class attribute was restated
inline on ~50 console controls across 16 templates, and had already drifted on
background, radius and focus-ring alpha. Their focus ring is **grass**, not the
global teal `.focus-ring` — these realms have their own accent.

## The iOS focus-zoom floor needed specificity, and never had it

`@media (pointer: coarse) { select { font-size: 16px } }` is (0,0,1) and loses
to the `text-sm` (0,1,0) every one of those controls carries — specificity beats
source order, so the floor documented under "Mobile pass" silently did nothing
for `<select>` and `<textarea>`. It worked for `<input>` only by accident: its
three `:not([type=…])` guards score (0,3,1).

The selector is now `:is(select, textarea):not([data-small-ok])`, which scores
(0,1,1) and wins. `data-small-ok` is the deliberate escape hatch. **Do not
simplify this selector** — it looks redundant and is the whole fix.

## An OnPush page may not host a Default component that mutates fields async

Constraint 2 says feature components stay non-OnPush because ~58 async handlers
mutate plain fields with no `markForCheck`. That is stated as a rule about the
COMPONENT. It is really a rule about the PAIR, and `/report-reader` broke it:
a new 2.0 page written OnPush over signals, hosting `app-auth-gate`, which is
one of those ~58.

CD is zone-based (`provideZoneChangeDetection`), so the XHR completion does
trigger an app-wide tick — and the tick SKIPS the OnPush page, because nothing
marked it dirty. The child underneath is never reached.

The symptom is not an error and nothing in the network tab looks wrong:
`POST /user/numCheck` returns 200 with the right body, the component's fields
are correct in memory, and the button sits on "Please wait…" forever. The GPS
district prefill in the same component silently did not render either.

Fixed in the CHILD, not by dropping the page's OnPush: `auth-gate` and
`pin-reset` now inject `ChangeDetectorRef` and call a private `rendered()`
after every async boundary — including `pin-reset`'s 60s resend `setInterval`,
which is an async boundary like any other and was counting down invisibly.
Fixing the child makes the gate work under ANY host; dropping the page's OnPush
would have fixed exactly one page and left the next one to rediscover this.

**Before putting an existing feature component inside an OnPush view, check
whether it mutates plain fields after a `subscribe`, an `await` or a timer.**
A sweep of every OnPush component's template against its children is in the
Session 6 notes; it currently reports zero remaining pairs.

## Backticks inside a `template:` OR `styles:` literal

`ds-table`, `ds-dialog` and `ToastService`'s host component each had markdown
code spans in their template COMMENTS. A backtick there terminates the template
string and the component cannot compile. Nothing imported them, so nothing found
out until the consoles wired them up. Use plain quotes inside `template:`.

**It happened a second time, in `styles:`, and cost the same hour.** Wiring
`ds-checkbox` (Session 6) failed the whole build with
`FatalDiagnosticError: Code: 1010 … styles at position 1` — no filename — from
a backtick in a CSS comment. Two more unwired components had it waiting
(`accordion-item`, `radio-group`); both are fixed.

The general rule behind both: **an unwired component has never been compiled.**
Angular only compiles what the app can reach, so anything still unimported is
unverified, not merely unused. Wire them one at a time and build after each.

## `color-scheme` is required, and was missing

```scss
:root, :root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark']         { color-scheme: dark; }
```

Without it every raw `<input>` in the app renders as a WHITE slab under
`[data-theme="dark"]` — the triage age field, the console date filters, every
login form. The UA paints form controls, scrollbars and the native date picker
from this property, not from our tokens, so **no amount of Tailwind on the
element fixes it.** It must be on `:root`, not `body`.

There is also an element-level floor for older WebViews and for Chrome's
`<input type="date">`:

```scss
input, select, textarea {
  background-color: rgb(var(--surface));
  color: rgb(var(--text));
}
```

Element specificity is deliberate — any explicit `bg-*` utility is a class and
still wins, so a control that opted into its own surface keeps it.

## Status ROLE tokens

`--success` / `--warning` / `--danger` are SOLID fills and stay that way. The
ink / tint / tint-strong / line roles for each were added because /triage's
urgency ladder (emergency / urgent / caution / reassure) was drawn in stock
`red-*`, `amber-*` and `green-*` — none of which swaps, so the entire ladder
rendered dark-on-dark.

| role | light | dark |
|---|---|---|
| `danger-ink` / `-tint` / `-tint-strong` / `-line` | red-700 / -50 / -100 / -200 | red-300 / -950 / -900 / -800 |
| `warning-ink` / `-ink-soft` / `-tint` / `-tint-strong` / `-line` | amber-700 / -600 / -50 / -100 / -200 | amber-300 / -400 / -950 / -900 / -800 |
| `success-ink` / `-tint` / `-tint-strong` / `-line` | green-700 / -50 / -100 / -200 | green-300 / -950 / -900 / -800 |

Same rule as every other role family here: ramp ENDS become roles, mid-ramp
FILLS stay palette. `bg-red-600` on the emergency banner and `bg-amber-600` on
"Load it" are correct unchanged in both themes.

## The /triage emergency banner stays at full saturation

It is the one line on the screen that must be unmissable. Toning it to a tint
would be a safety change dressed as a design one — **do not do it.** What was
fixed is craft only: `pt-safe-t` (it sat under the notch), a siren glyph, and a
`max-w-2xl` line so it fits on one line from ~640px.

It still wraps to two lines below ~420px. Shortening the sentence is a copy and
compliance decision, not a CSS one.

## The /triage header is solid, not glass

The thread is its own scroll region between a fixed header and a fixed
composer, which is the right layout for a chat — you do not want the composer
scrolling away. That means nothing ever passes UNDER the header, so glass there
would blur the page ground and pay for a compositor layer to look like a flat
panel. Do not "upgrade" it to `glass-2` to match the console shells; those
scroll the page, this one does not.

## The palette question, decided

Replacing the teal/cream identity was considered in Session 3 and rejected.
What made /triage look dated was not hue: it was a permanently-lit
full-saturation red bar, an assistant bubble that was an unadorned white box
with a 5% hairline, and half a screen of dead cream above the composer. Teal +
cream is also what production ships and what ~470 call sites reach through the
brand role tokens.

Same hue, better tone. If this comes up again, the answer is contrast,
elevation and dark-mode correctness — not a new ramp.

## The KnocDoc wordmark is tokenised

Was `style="color:#0a1480"` / `#4fb0f9` inline, repeated in landing, ad-landing
and triage-shell. The navy disappears against a dark surface. Now `--wm-knoc` /
`--wm-doc` with `.wm-knoc` / `.wm-doc` classes; the navy lifts to a readable
periwinkle in dark. Partner brand colour — check with them before changing the
light values.

## Contrast is a gate, and `--text-muted` is the one that failed

`--text-muted` was #7D9B96 from v1 and scored **3.00:1 on surface, 2.86:1 on the
page ground, 2.67:1 on `--surface-2`** — it failed WCAG AA (4.5:1) on every
ground in the app. That was survivable while it was a few timestamps; the
console pass put ~80 filter labels on it and /triage put its legal line on it.

Current values, verified:

| | light | dark |
|---|---|---|
| `--text-muted` | `85 115 111` (#55736F) — 5.16 / 4.92 / 4.60 | `155 185 180` (#9BB9B4) — 6.54 / 8.55 / 4.60 |

(surface / page bg / surface-2). **Do not lighten these back toward v1's value.**

### The `text-ink/<alpha>` ladder

Measured against all three grounds in both themes:

- **`/70` and above PASS.** `/60` and below FAIL — `/50` is 3.01:1 on white.
- 141 call sites at `/60` and below were swept onto `text-muted`.

If you need secondary text, use `text-muted`. If you need a dimmer body tone,
`/70` is the floor. Anything below `/70` is only legitimate for genuinely
decorative, `aria-hidden` content.

## Auditing tap targets requires a coarse pointer

The migration's mobile pass expresses its 44px floor as `coarse:min-h-[44px]`,
which only applies under `@media (pointer: coarse)`. **A desktop browser — and
Playwright — reports `pointer: fine`, so those rules are INERT and every one of
those controls measures under 44px.**

An audit that measures `getBoundingClientRect()` in a desktop browser will
report dozens of false violations. Either emulate touch, or exclude elements
carrying a `coarse:` class (which is what the Session 4 audit did, and it came
back clean).

## The skip link

`.skip-link` was styled in `styles.scss` from the migration onward and **nothing
rendered it** until Session 4. It now lives in `AppComponent`, and every
`<main>` in the app carries `id="main"`.

It `preventDefault()`s and focuses the target rather than letting the browser
follow `#main` — a bare fragment href in a routed app is a navigation, and the
router strips it. `tabindex="-1"` is set at click time so no `<main>` carries a
stray tab stop for pointer users.

It adds text to every prerendered page but sits OUTSIDE `<main>`, so `parity`
(which normalises `<main>` text only) stays green.

**Measuring it right after `.focus()` looks broken** — `getComputedStyle` during
its 150ms transition returns the t=0 value. Wait for the transition before
asserting on it.

## Exactly one `<main>` per document

/triage's doctors panel is an overlay OVER the chat, and both used to be
`<main>`. HTML allows one non-hidden `<main>`, and a screen reader offered two
cannot say which one you are in. The panel is a `<div>`. Keep it that way — any
new full-screen overlay in /triage is a region, not the document's main content.

## Focus indicators are a system affordance, not brand

There is ONE focus ring in this app: the teal `:focus-visible` outline in
`styles.scss`, and `.focus-ring` for components that need it as a class. An
earlier pass gave `.console-btn*` a grass ring to match the console accent,
which meant a single console page showed two different focus colours depending
on whether a control had opted into `.console-btn` or fallen through to the
global rule. Do not re-introduce per-realm focus colours.

## `ds-tabs` has a `tone`

`tone="console"` fills the selected pill with `bg-grass-600`; the default
`"brand"` uses `bg-teal-600`. The three console shells pass `console`. A teal
pill in a green app bar reads as a stray from another product — which is how it
looked until it was measured.

## `short:` — a height variant, for landscape

`@media (max-height: 520px)`, registered in `tailwind.config.js` next to
`coarse:`. A phone in landscape is ~390px TALL, and no WIDTH breakpoint can
express that: 844x390 is "desktop-wide". /triage stacks an emergency banner, an
app bar, the previous-chat banner and a two-row composer around a `flex-1`
thread, and at that height the conversation collapsed to ~90px.

Spend it on CHROME, never on content. Currently: banner and app-bar padding,
the "powered by" credit (`short:hidden` — pure branding), thread padding, and
the composer's resting height.

**The medical disclaimer under the composer is NOT chrome.** An earlier pass put
`short:hidden` on it to win 16px; that is a compliance change dressed as a
layout one, exactly like toning down the emergency banner would be. It stays
visible at every height.

Applied to /triage only so far. The console shells and the SEO/legal layouts
have the same stacked-chrome shape and have not been re-checked in landscape.

## Auditing many routes cheaply

Navigating per route is slow and burns context. The Session 4/5 sweeps run
inside a **320px-wide same-origin iframe**: set `src`, wait, audit
`contentDocument`, repeat. Layout overflow, tap-target sizes, form labels,
heading order, duplicate ids and landmark counts are all measurable that way,
and 25 routes fit in one `evaluate`.

Two gotchas, both learned the hard way and both documented above: measure tap
targets with `coarse:`-classed elements EXCLUDED (a desktop browser reports
`pointer: fine`, so those rules are inert), and do not read a transitioning
element's computed style at t=0.
