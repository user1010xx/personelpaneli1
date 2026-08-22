import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#edfaf6",
          100: "#d2f3e9",
          200: "#a6e6d4",
          300: "#6fd4b8",
          400: "#3bbf9e",
          500: "#17a888",
          600: "#0e8a70",
          700: "#0c6e5b",
          800: "#0f5749",
          900: "#0e473d",
          950: "#052920",
        },
        ink: {
          50: "#f4f5f3",
          100: "#e7e9e4",
          800: "#1c2421",
          900: "#101412",
          950: "#080b0a",
        },
        sidebar: {
          DEFAULT: "#0b0f0e",
          hover: "rgba(255,255,255,0.05)",
          active: "#17a888",
          border: "rgba(255,255,255,0.07)",
          muted: "#8a948e",
        },
      },
      boxShadow: {
        panel: "0 1px 0 rgba(16, 20, 18, 0.04), 0 12px 28px -20px rgba(16, 20, 18, 0.28)",
        "panel-lg": "0 24px 48px -28px rgba(8, 11, 10, 0.45)",
        glow: "0 0 0 1px rgba(23, 168, 136, 0.16), 0 10px 28px -16px rgba(14, 138, 112, 0.45)",
        sidebar: "16px 0 40px -28px rgba(0, 0, 0, 0.55)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
