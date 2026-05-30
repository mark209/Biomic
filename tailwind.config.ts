import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef9ff",
          100: "#d6f0ff",
          200: "#b5e5ff",
          300: "#83d5ff",
          400: "#49bdff",
          500: "#189ee8",
          600: "#007dc2",
          700: "#006590",
          800: "#075475",
          900: "#0b4661"
        },
        surface: "#f7f9fc",
        ink: "#191c1e",
        muted: "#3e4850",
        line: "#bec8d2",
        warning: "#db8215",
        success: "#117a48",
        danger: "#ba1a1a"
      },
      boxShadow: {
        soft: "0 12px 36px rgba(0, 55, 95, 0.08)",
        panel: "0 4px 18px rgba(25, 28, 30, 0.06)"
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Arial", "sans-serif"]
      }
    }
  },
  plugins: [forms]
};

export default config;
