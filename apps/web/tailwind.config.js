/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette FGS_IMMO : bleu & orange du logo (Fabelle Global Service)
        brand: {
          50: '#eef4fb',
          100: '#d7e6f6',
          200: '#b0cdec',
          300: '#7fabdc',
          400: '#4d84c7',
          500: '#2f66ac',
          600: '#1e4d8c',
          700: '#173c6d',
          800: '#132f56',
          900: '#112746',
          950: '#081528',
        },
        gold: {
          400: '#f2a355',
          500: '#e98b32',
          600: '#c96f1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
