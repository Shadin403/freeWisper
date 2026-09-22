/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0C13",
        surface: "#131522",
        border: "#25283D",
        accent: "#8B5CF6",
      },
    },
  },
  plugins: [],
};
