/** @type {import('tailwindcss').Config} */

// Token bridge, copied from DocTribe: every colour is a CSS custom property
// holding space-separated RGB channels, so `bg-teal-500/12`, `border-line/10`
// and `text-muted` all work AND swap with [data-theme] for free.
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

// The v1 type stack, restored. These four families are what
// doctoguide.knocdoc.in actually renders; v2 had pointed all of them at Clash
// Display, which collapsed a four-voice system into one.
//
// 'Noto Sans Devanagari' is appended to EVERY family, second-to-last, so it
// wins for Devanagari codepoints but never displaces the Latin faces — the chat
// is multilingual (Hindi / Hinglish) and none of the Latin faces covers
// Devanagari, so without it Hindi renders as tofu.
const FALLBACK = [
  '-apple-system', 'system-ui', '"Segoe UI"', 'Roboto', '"Helvetica Neue"',
  'Arial', '"Noto Sans"', '"Noto Sans Devanagari"', 'sans-serif',
];
const BODY = ['"DM Sans"', ...FALLBACK];              // body copy, buttons, links
const HEADING = ['Outfit', ...FALLBACK];              // headings, wordmark
const DISPLAY = ['Fraunces', '"Noto Sans Devanagari"', 'Georgia', 'serif']; // serif hero
const GROTESK = ['"Space Grotesk"', ...FALLBACK];     // console display

module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Small-phone guard (iPhone SE / 360dp Android). Carried over from the
      // base config: below this, header actions drop labels and keep the icon.
      screens: { xs: '400px' },

      colors: {
        teal: {
          50: rgb('--teal-50'), 100: rgb('--teal-100'), 200: rgb('--teal-200'),
          300: rgb('--teal-300'), 400: rgb('--teal-400'), 500: rgb('--teal-500'),
          600: rgb('--teal-600'), 700: rgb('--teal-700'), 800: rgb('--teal-800'),
          900: rgb('--teal-900'),
        },
        // Console theme (partner + admin + owner): warm cream + fresh grass green.
        grass: {
          50: rgb('--grass-50'), 100: rgb('--grass-100'), 200: rgb('--grass-200'),
          300: rgb('--grass-300'), 400: rgb('--grass-400'), 500: rgb('--grass-500'),
          600: rgb('--grass-600'), 700: rgb('--grass-700'), 800: rgb('--grass-800'),
          900: rgb('--grass-900'),
        },
        sand: { 50: rgb('--sand-50'), 100: rgb('--sand-100'), 200: rgb('--sand-200') },
        cream: rgb('--cream'),

        // Brand ROLE colours. See styles.scss: the teal ramp's two ends are used
        // as roles (page ink / brand tint) by ~470 call sites, and a palette step
        // cannot theme-swap because the same step is a brand fill elsewhere.
        // Light values are the exact ramp steps these replace.
        ink: rgb('--ink'),
        'ink-soft': rgb('--ink-soft'),
        'brand-ink': rgb('--brand-ink'),
        'brand-ink-soft': rgb('--brand-ink-soft'),
        'brand-tint': rgb('--brand-tint'),
        'brand-tint-strong': rgb('--brand-tint-strong'),
        'brand-line': rgb('--brand-line'),

        // Console ROLE colours — the grass ramp's ends, named. Same reasoning
        // as the brand roles above; see styles.scss "Console ROLE tokens".
        // The grass PALETTE stays for fills (bg-grass-600 under white text).
        'console-ink': rgb('--console-ink'),
        'console-ink-soft': rgb('--console-ink-soft'),
        'console-tint': rgb('--console-tint'),
        'console-tint-strong': rgb('--console-tint-strong'),
        'console-line': rgb('--console-line'),
        'console-gold': rgb('--console-gold'),
        'console-gold-soft': rgb('--console-gold-soft'),
        'console-gold-tint': rgb('--console-gold-tint'),
        'console-gold-tint-strong': rgb('--console-gold-tint-strong'),
        'console-gold-line': rgb('--console-gold-line'),

        // Status ROLE colours. `success`/`warning`/`danger` below stay the
        // SOLID fills; these are the ink / tint / hairline for each, which the
        // /triage urgency ladder needs in both themes.
        'danger-ink': rgb('--danger-ink'),
        'danger-tint': rgb('--danger-tint'),
        'danger-tint-strong': rgb('--danger-tint-strong'),
        'danger-line': rgb('--danger-line'),
        'warning-ink': rgb('--warning-ink'),
        'warning-ink-soft': rgb('--warning-ink-soft'),
        'warning-tint': rgb('--warning-tint'),
        'warning-tint-strong': rgb('--warning-tint-strong'),
        'warning-line': rgb('--warning-line'),
        'success-ink': rgb('--success-ink'),
        'success-tint': rgb('--success-tint'),
        'success-tint-strong': rgb('--success-tint-strong'),
        'success-line': rgb('--success-line'),

        // DocTribe's semantic aliases. DoctoGuide has no orange, so its accent IS teal.
        accent: rgb('--accent-warm'),
        bg: rgb('--bg'),
        surface: rgb('--surface'),
        'surface-2': rgb('--surface-2'),
        line: rgb('--border'),
        content: rgb('--text'),
        'content-strong': rgb('--text-strong'),
        muted: rgb('--text-muted'),
        success: rgb('--success'), warning: rgb('--warning'),
        danger: rgb('--danger'), info: rgb('--info'),
      },

      // Class NAMES are unchanged, so no template needs editing; only the
      // values are repointed — back to what v1 ships.
      fontFamily: {
        heading: HEADING,
        body: BODY,
        display: DISPLAY,
        grotesk: GROTESK,
        sans: BODY,
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },

      // NO fontSize or letterSpacing overrides — deliberately.
      //
      // v1 uses the stock Tailwind scale for both, so every ported template was
      // written against stock metrics. v2 had introduced a custom scale (from
      // DocTribe): 14px/1.55 instead of 14/20, 18px/1.6 instead of 18/28, and a
      // `tracking-tight` of -0.011em against Tailwind's -0.025em.
      //
      // Nothing looked broken, which is why it survived — every line was just
      // 1-2px looser than production, across 129 tracking-* usages and every
      // text size in the app. Restoring the stock scale makes the type metrics
      // identical to doctoguide.knocdoc.in instead of merely similar.

      // Radius has a RULE, not just a scale (see MIGRATION-NOTES "Redesign"):
      //   control (input/select/textarea/icon button) -> lg
      //   surface (card/panel/list row)               -> xl
      //   sheet / dialog / drawer                     -> 2xl
      //   pill (button/badge/chip/tab)                -> full
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '28px' },
      boxShadow: { e1: 'var(--elev-1)', e2: 'var(--elev-2)', e3: 'var(--elev-3)', glow: 'var(--elev-glow)' },
      transitionTimingFunction: {
        standard: 'cubic-bezier(.2,0,0,1)',
        decelerate: 'cubic-bezier(0,0,0,1)',
        accelerate: 'cubic-bezier(.3,0,1,1)',
      },

      // Motion durations, from styles.scss. ADDED to the stock scale, not
      // replacing it: `duration-150` and friends are used in ~40 places in
      // ported markup and must keep resolving. New work uses these three.
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },

      // Glass blur, so `backdrop-blur-md` means the token and not Tailwind's
      // unrelated 12px default. Names shadow the stock ones on purpose — a blur
      // value in this app should always be one of the three, and leaving the
      // stock scale alongside gives two vocabularies for one decision.
      //
      // This DOES move 7 existing call sites: sm 4px -> 10px (ds-drawer's
      // backdrop, three partner console filter bars) and md 12px -> 18px (three
      // partner-campaigns stat tiles). All are decorative frosted panels and all
      // read better heavier; none is a scrolling surface, so the extra blur is a
      // one-time composite, not per-frame work.
      backdropBlur: {
        sm: 'var(--blur-sm)',
        md: 'var(--blur-md)',
        xl: 'var(--blur-xl)',
      },

      // Safe-area insets as spacing, so `pb-safe-b` / `pt-safe-t` compose with
      // every spacing utility (padding, margin, inset, height) instead of each
      // call site inlining `style="padding-bottom: env(...)"` — which is what
      // triage-shell and the three console shells were each doing by hand.
      spacing: {
        'safe-t': 'var(--safe-top)',
        'safe-b': 'var(--safe-bottom)',
        'safe-l': 'var(--safe-left)',
        'safe-r': 'var(--safe-right)',
      },

      // Layering, named. Before this the app had z-20/30/40/50 chosen ad hoc per
      // component and one z-[2000] on the skip link, which is why the landing
      // account dropdown (z-30) and the triage doctor panel (z-40) could not
      // have been reasoned about together. ADDED to the stock scale — the
      // numeric z-0..z-50 utilities still exist for local stacking inside a
      // component, which is what they are actually good for.
      //
      // The order is the interaction order: chrome is under everything, a
      // popover opens from chrome so it must clear it, a dialog covers the page,
      // a popover inside a dialog must clear the dialog, and a toast has to be
      // visible over all of it because it is often what tells you the thing you
      // just did in the dialog worked.
      zIndex: {
        nav: '30',       // app bar, bottom nav, sticky headers
        overlay: '50',   // drawer, sheet, dialog and their backdrops
        popover: '60',   // popover, dropdown menu, tooltip, command palette
        toast: '70',     // always last, always visible
      },

      keyframes: {
        // --- from the base config, still referenced by landing / ad-landing ---
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin360: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(20px,-30px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.95)' },
        },
        // --- from DocTribe, used by the ds-* components ---
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },

        // --- overlay entrances, added for the redesign ---
        // Backdrops fade; panels move from the edge they belong to. A sheet
        // that fades in place reads as a dialog, and a dialog that slides up
        // reads as a sheet — the motion IS the affordance here.
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-100%)' },
          '100%': { opacity: '1', transform: 'none' },
        },
      },

      animation: {
        // COLLISION, resolved deliberately. Both source configs define
        // `animate-fade-up` with different keyframes, durations and easings:
        //   base     -> fadeUp 0.6s ease-in-out       (used across landing pages)
        //   DocTribe -> fade-up .32s cubic-bezier(0,0,0,1)
        // Ported markup wins the original class name; DocTribe's shorter one is
        // exposed under a distinct name for the ds-* components. Changing this
        // silently alters every fade-in on the landing page.
        'fade-up': 'fadeUp 0.6s ease-in-out',
        'fade-up-sm': 'fade-up .32s cubic-bezier(0,0,0,1) both',
        'scale-in': 'scale-in .18s cubic-bezier(.2,0,0,1) both',
        shimmer: 'shimmer 1.6s infinite',

        // Overlay entrances. `decelerate` (cubic-bezier(0,0,0,1)) on everything
        // that enters: fast off the mark, settling at the end, which is what
        // makes a panel feel like it was already on its way rather than started
        // when you asked. Durations come from the motion tokens.
        'fade-in': 'fade-in var(--dur-base) cubic-bezier(0,0,0,1) both',
        'slide-up': 'slide-up var(--dur-slow) cubic-bezier(0,0,0,1) both',
        'slide-in-right': 'slide-in-right var(--dur-slow) cubic-bezier(0,0,0,1) both',
        'slide-in-left': 'slide-in-left var(--dur-slow) cubic-bezier(0,0,0,1) both',
        spin360: 'spin360 1s linear infinite',
        blob: 'blob 14s ease-in-out infinite',
      },
    },
  },
  plugins: [
    // `coarse:` — a touch-input variant. Tailwind 3.4 has no pointer-* variants
    // (they arrive in v4), and the mobile touch floor must NOT key off a width
    // breakpoint: a phone in landscape is still a finger, and a narrow desktop
    // window is still a mouse. Used for the 44px tap-target floor on markup
    // ported from v1, so desktop keeps its original, denser sizing.
    ({ addVariant }) => addVariant('coarse', '@media (pointer: coarse)'),

    // `short:` — a SHORT viewport, not a narrow one. A phone in landscape is
    // ~390px TALL, and /triage stacks an emergency banner, an app bar, an
    // optional previous-chat banner and a two-row composer around a flex-1
    // thread: at that height the conversation itself collapses to about 90px.
    // Width breakpoints cannot express this — 844x390 is "desktop-wide".
    ({ addVariant }) => addVariant('short', '@media (max-height: 520px)'),
  ],
};
