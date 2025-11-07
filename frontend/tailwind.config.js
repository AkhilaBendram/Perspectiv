/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chrome: { 500: '#9a9a9a' }
      },
      boxShadow: {
        chrome: '0 10px 40px rgba(0,0,0,0.45)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};
