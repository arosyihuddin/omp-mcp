/** @type {import('tailwindcss').Config} */

// Semantic colour tokens are defined as RGB channel triplets in
// src/lib/styles/tokens.css so Tailwind opacity modifiers (bg-accent/10) work
// and a theme switch only has to swap CSS variables — no `dark:` duplication.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  darkMode: ['class', '.dark'],
  content: ['./index.html', './src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontFamily: {
      sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      mono: ['ui-monospace', '"SF Mono"', '"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: ['11px', '16px'],
      sm: ['12px', '18px'],
      base: ['13px', '20px'],
      md: ['14px', '20px'],
      lg: ['16px', '24px'],
      xl: ['20px', '28px'],
      '2xl': ['24px', '32px'],
    },
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: {
          DEFAULT: token('surface'),
          raised: token('surface-raised'),
          hover: token('surface-hover'),
          active: token('surface-active'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
          faint: token('fg-faint'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          fg: token('accent-fg'),
        },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        info: token('info'),
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      transitionDuration: { DEFAULT: '120ms' },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(-2px) scale(.98)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out',
        'pop-in': 'pop-in 120ms ease-out',
      },
    },
  },
  plugins: [],
};
