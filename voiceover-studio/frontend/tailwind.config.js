/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F2",
        surface: "#FFFFFF",
        ink: "#1C1917",
        muted: "#6B6259",
        accent: "#B4532A",
        accentHover: "#9A4524",
        line: "#E8E2D9",
        olive: "#4D7C0F",
        charcoal: "#171412",
      },
      fontFamily: {
        display: ['"Fraunces"', "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      maxWidth: { canvas: "1080px" },
      borderRadius: { btn: "6px" },
      boxShadow: {
        card: "0 1px 2px rgba(28,25,23,0.05), 0 4px 16px rgba(28,25,23,0.05)",
      },
    },
  },
  plugins: [],
};
