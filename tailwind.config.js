import colors from "tailwindcss/colors";

const periwinkle = {
  50: "#f3f4ff",
  100: "#eaedfe",
  200: "#d6d9f6",
  300: "#bdbff0",
  400: "#a8a0e3",
  500: "#8d86d6",
  600: "#6f69bf",
  700: "#55529c",
  800: "#3b3b6c",
  900: "#2a2a55",
  950: "#1a1a3a"
};

const sand = {
  50: "#fdf9f0",
  100: "#f8efdc",
  200: "#f1e2c2",
  300: "#e9d3a5",
  400: "#ddbf84",
  500: "#cba765",
  600: "#a98846",
  700: "#85692f",
  800: "#5f4a22",
  900: "#3f3118",
  950: "#231b0d"
};

const wine = {
  50: "#fbeeee",
  100: "#f6d9d6",
  200: "#f0b9b2",
  300: "#e8938a",
  400: "#e0655c",
  500: "#c93f3f",
  600: "#a82a3a",
  700: "#8a1c3b",
  800: "#6e1530",
  900: "#521027",
  950: "#2e0916"
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // "Wine & Periwinkle" palette. The stock scales are remapped so every existing
        // sky/cyan/blue/violet/pink/rose utility follows the brand without per-file edits.
        sky: periwinkle,
        violet: periwinkle,
        purple: periwinkle,
        blue: periwinkle,
        indigo: periwinkle,
        cyan: sand,
        fuchsia: sand,
        pink: sand,
        rose: wine,
        // Indigo-tinted inks for the dark theme and slate-compatible muted text.
        slate: {
          ...colors.slate,
          // Light-theme surfaces lean sand instead of cool grey.
          50: "#faf4e6",
          100: "#f4ebd8",
          200: "#e9dcc2",
          300: "#c5c9e7",
          400: "#9fa3cc",
          500: "#7d81ad",
          600: "#4f5380",
          700: "#2f3160",
          800: "#1f2048",
          900: "#15163a",
          950: "#0c0d24"
        },
        brand: {
          300: "#bdbff0",
          400: "#a8a0e3",
          500: "#8d86d6",
          600: "#6f69bf"
        },
        wine: wine,
        sand: sand,
        surface: {
          dark: "#0f172a",
          darker: "#020617",
          lighter: "#1e293b"
        }
      },
      fontFamily: {
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
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
