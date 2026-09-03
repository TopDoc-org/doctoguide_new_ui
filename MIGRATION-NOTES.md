# DoctoGuide 2.0 — migration notes

Angular 14 → 19 rebuild of `AIDoctorFront`, with a Capacitor Android target.
Functionality is frozen: same pages, same routes, same endpoints. Only the
framework, styling system and libraries changed.

Baseline for parity: `../doctoguide-baseline/` (v1 prerender output, HEAD
`2795811`). See `MIGRATION-BASELINE.md` in that folder.

## Verify (run all five after any change)

```bash
npm run build            # gates on prerender drift; must say "Prerendered 22 static routes"
                         # and "sitemap.xml written with 20 URLs". Must emit NO NG#### warnings.
npm run parity           # all 22 prerendered routes match the baseline; exit 0
npm run parity:behaviour # v1 -> v2: endpoints / analytics / routes / storage keys; exit 0
npx ng test --watch=false     # 81 specs
npm run apk:debug        # -> android/app/build/outputs/apk/debug/app-debug.apk
```

`parity` only sees prerendered HTML, so it covers the 22 public routes and
NOTHING else — /triage and the three console realms are noindex, never
prerendered, and therefore crossed the migration unchecked. `parity:behaviour`
is what covers them. It needs v1 checked out at `../AIDoctorFront`.

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
