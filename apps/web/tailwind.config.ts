import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        brand: {
          DEFAULT: '#123C35',
          dark: '#0B2F29',
          mid: '#3D6658',
          // Consolidated ramp (Phase 1). 100/50 remapped to the new tints.
          900: 'var(--brand-900)',
          800: 'var(--brand-800)',
          600: 'var(--brand-600)',
          100: 'var(--brand-100)',
          50: 'var(--brand-50)',
        },
        // ─── Consolidated system (Phase 1) — surfaces, borders, text, states ──
        surface: {
          page: 'var(--surface-page)',
          card: 'var(--surface-card)',
          raised: 'var(--surface-raised)',
          inset: 'var(--surface-inset)',
          hover: 'var(--surface-hover)',
          sidebar: '#FBFAF6',
          subtle: '#F4F5F2',
        },
        // Low-contrast borders (class: border-line / border-line-subtle / border-line-strong)
        line: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        // Three-level neutral text (class: text-content / text-content-secondary / text-content-muted)
        content: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        warning: {
          soft: 'var(--warning-bg)',
          strong: 'var(--warning-text)',
        },
        info: {
          soft: 'var(--info-bg)',
          strong: 'var(--info-text)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
          6: 'var(--chart-6)',
          7: 'var(--chart-7)',
        },
        // Semantic status tokens — one source of truth for meaning → colour.
        // success = verified/complete, warn = needs attention/incomplete,
        // danger = genuine adverse result. "Not assessed" uses neutral greys.
        success: {
          DEFAULT: '#15805F',
          fg: '#0C4A37',
          bg: '#E8F6F0',
          border: '#BFE6D6',
          soft: 'var(--success-bg)',
          strong: 'var(--success-text)',
        },
        warn: {
          DEFAULT: '#A86812',
          fg: '#7A4B0C',
          bg: '#FBF1DC',
          border: '#EAD3A0',
        },
        danger: {
          DEFAULT: '#B04A57',
          fg: '#822E39',
          bg: '#FBEBED',
          border: '#EFC9CE',
          soft: 'var(--danger-bg)',
          strong: 'var(--danger-text)',
        },
        sage: {
          DEFAULT: '#8FA491',
          light: '#C8D2C3',
        },
        cream: {
          DEFAULT: '#F7F3EA',
          surface: '#FFFDF7',
        },
        sand: {
          DEFAULT: '#C7A66A',
          light: '#E3D3B3',
        },
        charcoal: {
          DEFAULT: '#1F2522',
          mid: '#5F6761',
        },
        tier: {
          A: '#123C35',
          B: '#3D6658',
          C: '#8FA491',
          D: '#C7A66A',
          E: '#A96E52',
        },
        teal: {
          DEFAULT: '#00C896',
          dark: '#009E78',
          light: '#33D4A8',
        },
        ink: {
          DEFAULT: '#090E0C',
          mid: '#0F1A16',
          light: '#162620',
          border: '#1E3529',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Consolidated corners — sharper than before. Cards 14px, panels 12px.
        card: '14px',
        panel: '12px',
      },
      boxShadow: {
        // The single sanctioned card elevation. Tables/insets stay flat.
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Display face — reserved for the score, tier and major conclusions only.
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
