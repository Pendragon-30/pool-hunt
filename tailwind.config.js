/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // "navy" is the deep-blue half of the brand palette (headers, footer,
      // primary CTAs, hero backgrounds); the existing Tailwind `sky` scale
      // is used as-is for the light-blue accent half, so the two are always
      // used together rather than needing a second custom scale.
      colors: {
        navy: {
          50: '#eef4fb',
          100: '#d9e7f5',
          200: '#b3cfec',
          300: '#82b0de',
          400: '#4c8cc9',
          500: '#2d6cac',
          600: '#21548c',
          700: '#1c4470',
          800: '#17314c',
          900: '#122740',
          950: '#0a1628',
        },
      },
      // Barlow reads as a sturdier, more utilitarian/industrial grotesque
      // than a default SaaS font like Inter -- closer to the trade/contractor
      // sites this design is modeled after (metalbuildingoutfitters.com) than
      // to a generic AI-generated-landing-page look.
      fontFamily: {
        sans: [
          'Barlow',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        'step-in': {
          from: { opacity: 0, transform: 'translateX(12px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 600ms ease-out both',
        'step-in': 'step-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
