/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    './src/components/**/*.{ts,tsx,js,jsx}',
    './src/pages/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        'soft': '0 8px 24px rgba(0,0,0,0.08)',
        'elev': '0 12px 32px rgba(0,0,0,0.12)',
      },
      colors: {
        // Atlas Nova UI tokens — wired to CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        ring: 'hsl(var(--ring))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
      },
      keyframes: {
        'accordion-down': { from: { height: 0 }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: 0 } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
  safelist: [
    // Status badges / dynamic variants that might be built by mapping
    'bg-green-50','text-green-700','border-green-300',
    'bg-yellow-50','text-yellow-700','border-yellow-300',
    'bg-red-50','text-red-700','border-red-300',
    'bg-green-100','text-green-800',
    'bg-yellow-100','text-yellow-800',
    'bg-red-100','text-red-800',
    'dark',
    // table helpers / layout
    'sticky','top-0','z-10',
    // buttons/gradients we use in KPI tiles
    'from-primary','to-accent','bg-gradient-to-br',
  ],
};
