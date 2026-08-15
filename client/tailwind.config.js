/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          50: '#f4f6f8',
          100: '#e5e9ee',
          200: '#cdd5e0',
          300: '#a3b2c5',
          400: '#7389a5',
          500: '#506786',
          600: '#3d4f6c',
          700: '#324059',
          800: '#2b364a',
          900: '#1b2332',
          950: '#0f141f',
        },
        brand: {
          orange: '#f97316',
          blue: '#0284c7',
          emerald: '#10b981',
          amber: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
