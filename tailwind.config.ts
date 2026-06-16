import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        palm: "#006c5b",
        palmDark: "#005647",
        mint: "#e6f3ef",
        gold: "#a7782b",
        goldSoft: "#fbf6ea",
        goldBorder: "#ead8ad",
        paper: "#f4f7f6",
        line: "#d8e1de",
        neutralSoft: "#f8fafc",
        neutralSolid: "#64748b",
        success: "#059669",
        successSoft: "#ecfdf5",
        successBorder: "#a7f3d0",
        successText: "#065f46",
        warning: "#f59e0b",
        warningSoft: "#fffbeb",
        warningBorder: "#fde68a",
        warningText: "#92400e",
        danger: "#dc2626",
        dangerSoft: "#fef2f2",
        dangerBorder: "#fecaca",
        dangerText: "#991b1b"
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Tahoma", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
