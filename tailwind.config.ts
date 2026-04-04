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
        accent: '#38bdf8',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
};
export default config;
