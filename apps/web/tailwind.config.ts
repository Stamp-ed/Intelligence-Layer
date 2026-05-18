import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "#EFEEE7",
        content: "#F7F6F0",
        card: "#EFEEE7",
        raised: "#E6E5DC",
        "high-raised": "#DDDCD3",
        float: "#F7F6F0",
        ink: "#2B2C30",
        "ink-secondary": "rgba(43, 44, 48, 0.65)",
        "ink-dim": "rgba(43, 44, 48, 0.38)",
        "stamp-orange": "#F75440",
        "orange-deep": "#C53B26",
        "orange-light": "#FDF0EE",
        "orange-mid": "#FBDBD7",
        "semantic-verified": "#1E7E34",
        "semantic-review": "#B07800",
        "semantic-info": "#1A6FC4",
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
        heading: ['"Futura PT"', "Futura", "Century Gothic", "sans-serif"],
        body: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        mono: ['"SF Mono"', '"Fira Code"', "monospace"],
      },
      maxWidth: {
        content: "1100px",
      },
      borderRadius: {
        DEFAULT: "4px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(43, 44, 48, 0.06)",
        "card-hover": "0 2px 8px rgba(43, 44, 48, 0.08)",
        btn: "0 2px 12px rgba(247, 84, 64, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
