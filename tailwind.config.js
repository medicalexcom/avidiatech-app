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
        // Plus Jakarta Sans — primary UI font
        jakarta: ["var(--font-jakarta)", "Plus Jakarta Sans Variable", "Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        sans:    ["var(--font-jakarta)", "Plus Jakarta Sans Variable", "Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono:    ["ui-monospace", "SFMono-Regular", "JetBrains Mono", "Fira Code", "monospace"],
      },

      fontSize: {
        // Scale tuned for Plus Jakarta Sans — generous line-heights for readability
        "2xs": ["0.6875rem", { lineHeight: "1.125rem" }], // 11px / 18px
        "xs":  ["0.75rem",   { lineHeight: "1.25rem"  }], // 12px / 20px  ← was 1.1rem (too tight)
        "sm":  ["0.875rem",  { lineHeight: "1.375rem" }], // 14px / 22px  ← bumped from 13px
        "base":["0.9375rem", { lineHeight: "1.625rem" }], // 15px / 26px
        "lg":  ["1.0625rem", { lineHeight: "1.75rem"  }], // 17px / 28px
        "xl":  ["1.1875rem", { lineHeight: "1.875rem" }], // 19px / 30px
        "2xl": ["1.375rem",  { lineHeight: "2rem"     }], // 22px / 32px
        "3xl": ["1.625rem",  { lineHeight: "2.25rem"  }], // 26px / 36px
        "4xl": ["2rem",      { lineHeight: "2.5rem"   }], // 32px / 40px
        "5xl": ["2.5rem",    { lineHeight: "3rem"     }], // 40px / 48px
        "6xl": ["3.125rem",  { lineHeight: "3.75rem"  }], // 50px / 60px
      },

      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.03em",
        tight:    "-0.02em",
        snug:     "-0.01em",
        normal:   "0em",
        wide:     "0.01em",
        wider:    "0.05em",
        widest:   "0.15em",
      },

      fontWeight: {
        thin:       "100",
        extralight: "200",
        light:      "300",
        normal:     "400",
        medium:     "500",
        semibold:   "600",
        bold:       "700",
        extrabold:  "800",
        black:      "900",
      },

      colors: {
        brand: {
          // Neutral / marketing
          bg: "#f8fafc",        // slate-50
          surface: "#ffffff",   // white
          text: "#020617",      // slate-950
          muted: "#64748b",     // slate-500

          // Primary brand (indigo)
          primary: "#6366f1",       // indigo-500
          primarySoft: "#eef2ff",   // indigo-50
          primaryStrong: "#4f46e5", // indigo-600

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
        "glow-indigo":  "0 0 24px rgba(99,102,241,0.35), 0 0 48px rgba(99,102,241,0.15)",
        "glow-cyan":    "0 0 24px rgba(6,182,212,0.35), 0 0 48px rgba(6,182,212,0.15)",
        "glow-fuchsia": "0 0 24px rgba(236,72,153,0.3), 0 0 48px rgba(236,72,153,0.12)",
        "glow-emerald": "0 0 24px rgba(16,185,129,0.3), 0 0 48px rgba(16,185,129,0.12)",
        // Nav / interactive
        "nav-active":   "0 0 0 1px rgba(99,102,241,0.4), 0 2px 8px rgba(99,102,241,0.2)",
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
