/** @type {import('tailwindcss').Config} */
// Tailwind processes these at build time so they must be literal values, not CSS vars.
// Each color mirrors a token in src/styles/tokens.css — keep them in sync manually.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark-mode streetwear palette — mirrors var(--color-dark-bg) etc. in tokens.css
        midnight:         '#0A0A0A', // → var(--color-dark-bg)
        concrete:         '#222222', // → var(--color-dark-surface)
        'concrete-light': '#2E2E2E', // → var(--color-dark-surface-raised)
        lime:             '#CCFF00', // → var(--color-lime)
        'lime-dim':       '#AADD00', // → var(--color-lime-dim)
        'lime-dark':      '#88BB00', // → var(--color-lime-dark)
        ash:              '#888888', // → var(--color-dark-muted)
        smoke:            '#AAAAAA', // → var(--color-dark-subtle)
        offwhite:         '#F0F0F0', // → var(--color-dark-text)
      },
      fontFamily: {
        display: ['"Anton"', '"Impact"', 'sans-serif'],
        heading: ['"Archivo Black"', '"Arial Black"', 'sans-serif'],
        body: ['"Barlow Condensed"', '"Barlow"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      fontSize: {
        '10xl': '10rem',
        '11xl': '12rem',
        '12xl': '14rem',
      },
      animation: {
        'marquee': 'marquee 12s linear infinite',
        'marquee-slow': 'marquee 24s linear infinite',
        'marquee-fast': 'marquee 6s linear infinite',
        'marquee-reverse': 'marquee-reverse 14s linear infinite',
        'glitch': 'glitch 0.4s steps(2) infinite',
        'glitch-once': 'glitch 0.4s steps(2) 1',
        'pulse-lime': 'pulse-lime 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease forwards',
        'flicker': 'flicker 3s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        glitch: {
          '0%':   { transform: 'translate(0,0)',    clipPath: 'inset(0 0 0 0)' },
          '10%':  { transform: 'translate(-3px,1px)', clipPath: 'inset(20% 0 50% 0)' },
          '20%':  { transform: 'translate(3px,-1px)', clipPath: 'inset(60% 0 10% 0)' },
          '30%':  { transform: 'translate(-1px,3px)', clipPath: 'inset(0 0 80% 0)' },
          '40%':  { transform: 'translate(1px,-3px)', clipPath: 'inset(40% 0 40% 0)' },
          '50%':  { transform: 'translate(-3px,1px)', clipPath: 'inset(10% 0 70% 0)' },
          '100%': { transform: 'translate(0,0)',    clipPath: 'inset(0 0 0 0)' },
        },
        'pulse-lime': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(204,255,0,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(204,255,0,0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'flicker': {
          '0%,19%,21%,23%,25%,54%,56%,100%': { opacity: '1' },
          '20%,24%,55%': { opacity: '0.4' },
        },
      },
      boxShadow: {
        // Tailwind shadow strings must be literals. Colors below mirror tokens.css.
        'hard':       '4px 4px 0px #CCFF00', // lime → var(--color-lime)
        'hard-white': '4px 4px 0px #FFFFFF', // white → var(--color-text-inverse)
        'hard-black': '4px 4px 0px #000000', // black
        'hard-lg':    '6px 6px 0px #CCFF00', // lime → var(--color-lime)
        'hard-red':   '4px 4px 0px #FF3B3B', // error red → var(--color-hard-red)
        'hard-sm':    '2px 2px 0px #CCFF00', // lime → var(--color-lime)
        'glow-lime':  '0 0 20px rgba(204,255,0,0.35), 0 0 60px rgba(204,255,0,0.1)',
      },
      borderWidth: {
        '3': '3px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
};
