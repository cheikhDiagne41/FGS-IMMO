/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette FGS_IMMO : vert immobilier + or
        brand: {
          50: '#eefdf3',
          100: '#d6f9e1',
          200: '#b0f1c8',
          300: '#7be4a8',
          400: '#41cf82',
          500: '#1cb567',
          600: '#0f9253',
          700: '#0d7344',
          800: '#0f5b39',
          900: '#0d4a30',
          950: '#032918',
        },
        gold: {
          400: '#f5c451',
          500: '#e6a817',
          600: '#c8890f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
