import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { navy: "#101A2B", ivory: "#F8F4EB", gold: "#B99A5B", ink: "#222222" },
    fontFamily: { serif: ["var(--font-serif)", "Georgia", "serif"], sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
  } },
  plugins: [],
} satisfies Config;
