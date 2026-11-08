/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sri Adithya Organics Premium Enterprise Palette
        ivory: {
          DEFAULT: '#F6F5EF',
          subtle: '#FAF9F5',
          dark: '#ECEAE0',
        },
        forest: {
          DEFAULT: '#244B37',
          dark: '#1C3C2C',
          primary: '#496B45',
          hover: '#1B3728',
          light: '#315A42',
        },
        sage: {
          DEFAULT: '#8A9B69',
          light: '#E2E8D7',
          subtle: '#F1F4EC',
          dark: '#6F8050',
        },
        earth: {
          border: '#E6E7DD',
          'border-light': '#EFEFE7',
          'border-dark': '#D3D5C5',
          surface: '#FBFBFA',
        },
        natural: {
          dark: '#26352B',
          DEFAULT: '#26352B',
          muted: '#778176',
          subtle: '#9AA39A',
          light: '#BDC4BD',
        },
        // Brand palette backwards-compatible mapping
        brand: {
          50: '#F4F7F2',
          100: '#E4ECE1',
          200: '#CAD9C4',
          300: '#A6BE9E',
          400: '#8A9B69',
          500: '#496B45',
          600: '#3D5B3A',
          700: '#2F482E',
          800: '#244B37', // Deep Forest Green
          900: '#1A3325',
          950: '#0E1D15',
        },
        accent: {
          50: '#FAF8F0',
          100: '#F5EED9',
          200: '#E9DAB1',
          300: '#DCB862',
          400: '#CFA03E',
          500: '#B88628',
          600: '#94661D',
          700: '#754D16',
          800: '#5C3A11',
          900: '#472B0D',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(36, 75, 55, 0.04), 0 1px 2px 0 rgba(36, 75, 55, 0.02)',
        'card-hover': '0 4px 12px 0 rgba(36, 75, 55, 0.08), 0 1px 3px 0 rgba(36, 75, 55, 0.04)',
        'elevated': '0 10px 30px -5px rgba(36, 75, 55, 0.08), 0 8px 10px -6px rgba(36, 75, 55, 0.03)',
      }
    },
  },
  plugins: [],
}

