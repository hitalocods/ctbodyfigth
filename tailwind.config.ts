import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#fff8e6",
          100: "#fbeab5",
          200: "#f6d77b",
          300: "#eab94b",
          400: "#c8941f",
          500: "#b88718",
          600: "#8f6715",
          700: "#684b12",
          800: "#43300d",
          900: "#241c0a",
        },
        status: {
          active: "#1f7a53",
          expired: "#8e3434",
          frozen: "#355c7d",
          warning: "#b88718",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(246, 215, 123, 0.14), 0 12px 40px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
