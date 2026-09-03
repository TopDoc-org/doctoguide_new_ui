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
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '28px' },
      boxShadow: { e1: 'var(--elev-1)', e2: 'var(--elev-2)', e3: 'var(--elev-3)', glow: 'var(--elev-glow)' },
      transitionTimingFunction: {
        standard: 'cubic-bezier(.2,0,0,1)',
        decelerate: 'cubic-bezier(0,0,0,1)',
        accelerate: 'cubic-bezier(.3,0,1,1)',
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
  ],
};
