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
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "JetBrains Mono", "Fira Code", "monospace"],
      },

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

      boxShadow: {
        // Premium card shadows
        "card":         "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        "card-md":      "0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08)",
        "card-lg":      "0 4px 16px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.10)",
        "card-dark":    "0 2px 8px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.5)",
        // Ambient glow for primary elements
        "glow-cyan":    "0 0 24px rgba(6,182,212,0.35), 0 0 48px rgba(6,182,212,0.15)",
        "glow-fuchsia": "0 0 24px rgba(236,72,153,0.3), 0 0 48px rgba(236,72,153,0.12)",
        "glow-emerald": "0 0 24px rgba(16,185,129,0.3), 0 0 48px rgba(16,185,129,0.12)",
        // Nav / interactive
        "nav-active":   "0 0 0 1px rgba(6,182,212,0.4), 0 2px 8px rgba(6,182,212,0.2)",
        // Inner / inset
        "inner-sm":     "inset 0 1px 2px rgba(0,0,0,0.06)",
        // Elevated modal/overlay
        "overlay":      "0 8px 32px rgba(0,0,0,0.14), 0 32px 64px rgba(0,0,0,0.12)",
      },

      backgroundImage: {
        // Subtle mesh gradients used for page backgrounds and hero sections
        "mesh-cyan":    "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(6,182,212,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(16,185,129,0.10) 0%, transparent 60%)",
        "mesh-fuchsia": "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(236,72,153,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)",
        "grid-fine":    "linear-gradient(to right, rgba(100,116,139,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.06) 1px, transparent 1px)",
        "grid-fine-dark": "linear-gradient(to right, rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.04) 1px, transparent 1px)",
      },

      backgroundSize: {
        "grid-48": "48px 48px",
      },

      animation: {
        "fade-in":      "fadeIn 0.2s ease-out",
        "slide-up":     "slideUp 0.2s ease-out",
        "pulse-soft":   "pulseSoft 2s ease-in-out infinite",
      },

      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
      },
    },
  },

  plugins: [],
};
