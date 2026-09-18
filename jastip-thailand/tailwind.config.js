/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        offwhite: '#FAF8F5',
        charcoal: {
          DEFAULT: '#2B2B2B',
          light: '#3F3F3F',
          soft: '#5A5A5A',
        },
        gold: {
          DEFAULT: '#C9A24B',
          light: '#E3C77A',
          dark: '#A9822F',
        },
        thai: {
          jade: '#0F5C4E',
          coral: '#D96C4E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
