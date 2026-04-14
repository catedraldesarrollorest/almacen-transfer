/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7F1D1D',
        secondary: '#C9A84C',
        accent: '#F59E0B',
        success: '#10B981',
        error: '#EF4444',
      }
    },
  },
  plugins: [],
}