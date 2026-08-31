# DoctoGuide 2.0 — migration notes

Angular 14 → 19 rebuild of `AIDoctorFront`, with a Capacitor Android target.
Functionality is frozen: same pages, same routes, same endpoints. Only the
framework, styling system and libraries changed.

Baseline for parity: `../doctoguide-baseline/` (v1 prerender output, HEAD
`2795811`). See `MIGRATION-BASELINE.md` in that folder.

## Verify (run all four after any change)

```bash
npm run build      # gates on prerender drift; must say "Prerendered 22 static routes"
                   # and "sitemap.xml written with 20 URLs"
npm run parity     # all 22 routes match the baseline; exit 0
npx ng test --watch=false     # 81 specs
npm run apk:debug  # -> android/app/build/outputs/apk/debug/app-debug.apk
```

Also confirm no realm leaked into the prerender:
`dist/doctoguide/browser/{admin,owner,partner,triage}` must NOT exist.

## Decisions still needing sign-off

1. **`district` in signup payloads.** v1 had an uncommitted change adding
   `district` to `POST /user/setPin` and `POST /user/signup`. Ported as-is —
   the working tree was the latest intent and the Phase-0 baseline was built
   with it. Pinned by a spec in `ai-doctor-api.service.spec.ts`. One-line
   revert if unwanted.

2. **`partner-dashboard` campaign URL.** v1 builds it from
   `window.location.origin`, which is `https://localhost` inside the Capacitor
   WebView — the links it generates are dead in the APK. `environment.siteUrl`
   exists for the fix. NOT APPLIED: it is technically a behaviour change.

3. **`@capacitor/share` is installed but NOT wired.** v1's `shareReport()` uses
   `navigator.share` with an `alert()` fallback; inside the WebView that
   fallback is what users would get. Wiring `Share.share()` means editing
   `triage-shell`, which is currently a near-verbatim port.

## Added for the APK (no web equivalent — an addition, not a port)

`core/native/back-button.service.ts`. Android hardware back: close overlay →
`history.back()` → double-press-to-exit. Without it Capacitor exits the app on
the first press, mid-consult. Inert in a browser.
**Not yet wired** to triage's drawer / dialogs via `registerOverlay()`.

## Known, accepted differences from v1

- `/` body text is ~198 chars shorter. PrimeNG's carousel ran in circular mode
  and cloned the first and last hero slides into the DOM, so the baseline
  contains two slides twice. `ds-carousel` keeps each slide once; all six are
  still crawlable. Recorded in `scripts/parity-diff.mjs`.
- Material ligature names (`arrow_forward`, `chat_bubble_outline`) no longer
  appear in page text. v1 was leaking icon names into its own indexable copy.
- `font-display` was a serif (Fraunces) and is now Clash Display.

## Deferred (deliberate — do after parity sign-off, as reviewed commits)

- **Sub-44px tap targets in ported v1 markup** (e.g. profile's back button at
  34px). Editing ported markup mid-parity is scope creep; batch as one
  mobile-a11y commit.
- **Dead alpha classes.** Tailwind only honours opacity modifiers in
  `theme.opacity`; `/15`, `/45`, `/55` emit NOTHING. v1 has 23 such usages, so
  they render as inherited colour, not as intended. Kept dead for parity.
  `text-teal-900/55` was clearly meant to be muted text. See
  `tailwind.config.js` for why the scale was not extended.
- **`*ngIf` / `*ngFor` → `@if` / `@for`** — one mechanical commit with the
  parity suite as the net.
- **Delete `features/dev/ds-gallery.component.ts`** (its route is already gone).
- **Clash Display 700 preload** — confirm the landing hero actually uses 700;
  drop the preload if not.

## Traps worth remembering

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
