import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        palm: "#2d6a5a",
        palmDark: "#234f43",
        mint: "#e6f0ec",
        gold: "#a7782b",
        goldSoft: "#fbf6ea",
        goldBorder: "#ead8ad",
        warmGray: "#79726a",
        warmGraySoft: "#f5f3f0",
        warmGrayBorder: "#e2ddd5",
        warmGrayText: "#5b5347",
        paper: "#f4f7f6",
        line: "#d8e1de",
        // DGA كود المنصات — لون البنفسجي مستوحى من زهرة الخزامى
        violet: "#6B3D99",
        violetDark: "#4E2D72",
        violetSoft: "#F7F0FF",
        violetBorder: "#DCC8F5",
        violetText: "#5B2D8E"
      },
      fontFamily: {
        sans: ["Najiz Muhameen", "IBM Plex Sans Arabic", "Tahoma", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
