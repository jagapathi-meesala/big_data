/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fa',
          100: '#e4ebf2',
          200: '#c5d5e6',
          300: '#96b6d4',
          400: '#5e8fbe',
          500: '#3f73a4',
          600: '#305b87',
          700: '#284a6e',
          800: '#233f5d',
          900: '#203750',
          950: '#152336',
        },
      },
    },
  },
  plugins: [],
}
