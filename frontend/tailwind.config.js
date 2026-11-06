/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF9',
          100: '#F7F5EC',
          200: '#EFECE0',
          300: '#E4DFCE',
        },
        forest: {
          DEFAULT: '#315C45',
          dark: '#244534',
          light: '#3C7054',
        },
        sage: {
          DEFAULT: '#66866B',
          dark: '#526D57',
          light: '#809E85',
          pale: '#E9EFEA',
        },
        status: {
          present: '#2E7D32',
          absent: '#D32F2F',
          late: '#E65100',
          early: '#C2185B',
          pending: '#F57C00',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
