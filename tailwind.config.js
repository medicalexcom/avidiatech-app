/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable dark mode via a class on <html> (managed by next-themes)
  darkMode: "class",

  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}", // safe to include if you ever add /pages
  ],

  theme: {
    extend: {
      // You can add Avidia-specific tokens here later if you want, e.g.:
      // colors: {
      //   avidia: {
      //     primary: "#0f172a",
      //     accent: "#22d3ee",
      //   },
      // },
    },
  },

  plugins: [],
};
