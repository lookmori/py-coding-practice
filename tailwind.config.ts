import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 主题色 — 自动跟随 .dark/.light class
        "th-bg": "var(--bg-primary)",
        "th-bg2": "var(--bg-secondary)",
        "th-card": "var(--bg-card)",
        "th-hover": "var(--bg-hover)",
        "th-border": "var(--border)",
        "th-text": "var(--text-primary)",
        "th-text2": "var(--text-secondary)",
        "th-muted": "var(--text-muted)",
        "th-blue": "var(--accent-blue)",
        "th-green": "var(--accent-green)",
        "th-orange": "var(--accent-orange)",
        "th-purple": "var(--accent-purple)",
        "th-yellow": "var(--accent-yellow)",
      },
    },
  },
  plugins: [],
};
export default config;
