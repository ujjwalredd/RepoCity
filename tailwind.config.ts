import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F172A",
        surface: "#1E293B",
        "surface-2": "#334155",
        ink: "#F8FAFC",
        muted: "#94A3B8",
        accent: "#22C55E",
        edge: { from: "#38BDF8", to: "#818CF8" },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "Fira Code", "monospace"],
        sans: ["var(--font-sans)", "Fira Sans", "sans-serif"],
      },
      zIndex: { overlay: "10", panel: "20", toolbar: "30", modal: "50" },
    },
  },
  plugins: [],
};
export default config;
