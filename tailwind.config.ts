import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211d",
        palm: "#1f6f55",
        mint: "#e8f4ef",
        gold: "#b68a35",
        paper: "#f7f8f5",
        line: "#d9dfd7"
      },
      fontFamily: {
        sans: ["Tahoma", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
