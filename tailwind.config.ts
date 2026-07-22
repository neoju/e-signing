import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        panel: "#111114",
        border: "#1f1f24",
        muted: "#8a8a94",
        text: "#f5f5f7",
        accent: "#7c5cff",
        accent2: "#22d3ee",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Instrument Serif", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(124,92,255,0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
