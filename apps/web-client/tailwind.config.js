/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mango: {
          accent: '#2dd4ff',
          'accent-light': '#67e8f9',
          'navy-700': '#1a3a5c',
          'navy-800': '#122d4a',
          'navy-900': '#0d2847',
          'navy-950': '#0a1628',
        },
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        accent: ['Dancing Script', 'cursive'],
      },
    },
  },
  plugins: [],
}
