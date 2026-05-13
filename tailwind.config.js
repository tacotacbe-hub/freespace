/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#003366',
        'brand-emerald': '#50C878',
      },
      borderRadius: {
        'xl': '12px',
      },
      fontFamily: {
        'sans': ['Lexend', 'Google Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
