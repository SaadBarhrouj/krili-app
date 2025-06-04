// krili-frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}", // Très important !
  ],
  darkMode: 'media', // ou 'class' - 'media' réagit au système d'exploitation
  theme: {
    extend: {},
  },
  plugins: [],
}
