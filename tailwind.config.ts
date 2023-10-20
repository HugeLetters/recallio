import { type Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { lato: ["var(--font-lato, Lato)", ...defaultTheme.fontFamily.sans] },
      colors: {
        app: {
          gold: "hsla(47, 87%, 56%)",
          green: "hsla(122, 39%, 49%)",
        },
      },
      boxShadow: { top: "0 -5px 10px", bottom: "0 5px 10px" },
      dropShadow: { top: "0 -1px 10px", around: "0 0 3px" },
      animation: {
        "slide-up": "slide-up 200ms ease-in-out",
        "fade-in": "fade-in 200ms ease-in-out",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [
    plugin(({ addVariant, matchVariant }) => {
      addVariant("selected", "&:is(:focus-within,:hover)");
      addVariant("group-selected", ":merge(.group):is(:focus-within,:hover) &");
      addVariant("peer-selected", ":merge(.peer):is(:focus-within,:hover) ~ &");
      matchVariant("not", (value) => `&:not(${value})`);
    }),
  ],
} satisfies Config;
