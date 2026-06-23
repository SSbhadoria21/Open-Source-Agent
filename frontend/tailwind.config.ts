import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0F",
        surface: "#0F0F1A",
        "surface-raised": "#151525",
        primary: "#6E56CF",
        secondary: "#00D4FF",
        success: "#00E5A0",
        warning: "#FFB800",
        critical: "#FF4444",
        "text-primary": "#EAEAF5",
        "text-secondary": "#8888AA",
        "border-color": "rgba(110, 86, 207, 0.2)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      boxShadow: {
        glow: "0 0 20px rgba(110, 86, 207, 0.4)",
        "glow-secondary": "0 0 20px rgba(0, 212, 255, 0.4)",
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        pulseGlow: "pulseGlow 2s infinite",
        travel: "travel 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "from": { backgroundPosition: "-200% 0" },
          "to": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(110, 86, 207, 0.4)" },
          "50%": { boxShadow: "0 0 24px rgba(110, 86, 207, 0.9)" },
        },
        travel: {
          "from": { strokeDashoffset: "100" },
          "to": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
