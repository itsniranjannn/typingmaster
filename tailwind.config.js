import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Aurora palette: violet primary, fuchsia accent, indigo support.
        // Remapping the stock scales re-themes every existing sky/cyan/blue utility at once.
        sky: colors.violet,
        cyan: colors.fuchsia,
        blue: colors.indigo,
        // Slightly purple-tinted inks for the dark theme.
        slate: {
          ...colors.slate,
          700: "#342d52",
          800: "#1f1a33",
          900: "#14102a",
          950: "#0b0818"
        },
        brand: {
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed"
        },
        surface: {
          dark: "#0f172a",
          darker: "#020617",
          lighter: "#1e293b"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }]
      }
    }
  },
  plugins: []
};
