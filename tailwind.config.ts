import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        palm: "#006c5b",
        mint: "#e6f3ef",
        gold: "#a7782b",
        paper: "#f5f7f6",
        line: "#d8e1de"
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Tahoma", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
