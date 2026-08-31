/** @type {import('tailwindcss').Config} */

// Token bridge, copied from DocTribe: every colour is a CSS custom property
// holding space-separated RGB channels, so `bg-teal-500/12`, `border-line/10`
// and `text-muted` all work AND swap with [data-theme] for free.
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

// Locked decision: system-sans body stack, Clash Display for headings, and
// 'Noto Sans Devanagari' appended to EVERY family. Devanagari sits second-to-last
// so it wins for Devanagari codepoints but never displaces the Latin faces —
// the chat is multilingual (Hindi / Hinglish) and Clash Display has no
// Devanagari coverage, so without this Hindi renders as tofu.
const SANS = [
  '-apple-system', 'system-ui', '"Segoe UI"', 'Roboto', '"Helvetica Neue"',
  'Arial', '"Noto Sans"', '"Noto Sans Devanagari"', 'sans-serif',
];
const DISPLAY = ['"Clash Display"', ...SANS];

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

      // Class NAMES are preserved from the base config so no template needs
      // editing; only the values are repointed.
      //   heading: was Outfit          -> Clash Display
      //   body:    was DM Sans         -> system sans
      //   display: was Fraunces (SERIF) -> Clash Display  << visible change
      //   grotesk: was Space Grotesk   -> Clash Display
      fontFamily: {
        heading: DISPLAY,
        body: SANS,
        display: DISPLAY,
        grotesk: DISPLAY,
        sans: SANS,
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },

      fontSize: {
        xs: ['12px', '1.5'], sm: ['14px', '1.55'], base: ['16px', '1.6'],
        lg: ['18px', '1.6'], xl: ['20px', '1.5'], '2xl': ['24px', '1.35'],
        '3xl': ['30px', '1.25'], '4xl': ['36px', '1.15'], '5xl': ['48px', '1.08'],
        '6xl': ['60px', '1.04'], '7xl': ['72px', '1.0'],
      },
      letterSpacing: { tightest: '-0.022em', tighter: '-0.016em', tight: '-0.011em' },
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
  plugins: [],
};
