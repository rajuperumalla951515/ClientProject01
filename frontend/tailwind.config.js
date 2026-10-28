/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rootly: {
          dark: '#142817',
          forest: '#1B3B22',
          forestLight: '#264E2F',
          moss: '#4F6F52',
          sage: '#739072',
          sageLight: '#86A789',
          sagePale: '#D2E3C6',
          sageMist: '#EBF3E8',
          cream: '#FAF8F5',
          creamDark: '#F4EFE6',
          sand: '#ECE5D8',
          earth: '#C86D51',
          earthDark: '#9E4A32',
          amber: '#D97706',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        display: ['"Cabinet Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'card': '0 4px 20px -2px rgba(27, 59, 34, 0.06), 0 2px 6px -1px rgba(27, 59, 34, 0.03)',
        'lift': '0 12px 30px -4px rgba(27, 59, 34, 0.12), 0 4px 10px -2px rgba(27, 59, 34, 0.06)',
      }
    },
  },
  plugins: [],
}

