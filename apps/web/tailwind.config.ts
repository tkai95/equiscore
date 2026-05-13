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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
