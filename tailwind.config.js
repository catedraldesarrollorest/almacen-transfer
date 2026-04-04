/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        secondary: '#2DD4BF',
        accent: '#F59E0B',
        success: '#10B981',
        error: '#EF4444',
      }
    },
  },
  plugins: [],
}