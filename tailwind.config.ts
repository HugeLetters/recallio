import { type Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { lato: ["var(--font-lato)", ...defaultTheme.fontFamily.sans] },
      colors: {
        accent: {
          gold: "hsla(47, 87%, 56%)",
          green: "hsla(122, 39%, 49%)",
        },
      },
      boxShadow: { top: "0 -5px 10px", bottom: "0 5px 10px" },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("current", ["&:focus-within", "&:hover"]);
    }),
  ],
} satisfies Config;
