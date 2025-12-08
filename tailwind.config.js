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
      colors: {
        brand: {
          // Neutral / marketing
          bg: "#f8fafc",        // slate-50
          surface: "#ffffff",   // white
          text: "#020617",      // slate-950
          muted: "#64748b",     // slate-500

          // Primary brand (cyan)
          primary: "#06b6d4",       // cyan-500
          primarySoft: "#ecfeff",   // cyan-50
          primaryStrong: "#0891b2", // cyan-600

          // Secondary (emerald)
          secondary: "#22c55e",     // emerald-500
          secondarySoft: "#ecfdf5", // emerald-50

          // Warm accent (amber)
          warm: "#f59e0b",      // amber-500
          warmSoft: "#fffbeb",  // amber-50

          // AI / Describe accent (pink/fuchsia)
          ai: "#ec4899",        // pink-500
          aiSoft: "#fdf2f8",    // pink-50
        },
      },
    },
  },

  plugins: [],
};
