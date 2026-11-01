/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F6F1',
          100: '#DCEADF',
          200: '#BAD5BF',
          300: '#8EB996',
          400: '#5F996B',
          500: '#3A7747',
          600: '#2A5C35',
          700: '#21492B',
          800: '#1B3B22', // Primary Brand Forest Green
          900: '#142817', // Darkest Forest
          950: '#0B170E',
        },
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'elevated': '0 10px 25px -5px rgba(27, 59, 34, 0.08), 0 8px 10px -6px rgba(27, 59, 34, 0.04)',
      }
    },
  },
  plugins: [],
}
