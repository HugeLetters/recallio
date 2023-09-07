import { type Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          gold: "hsla(47, 87%, 56%)",
          green: "hsla(122, 39%, 49%)",
        },
        text: {
          dark: "hsla(112, 52%, 10%)",
          gray: "hsla(119, 2%, 59%)",
        },
        background: "hsla(60, 33%, 99%)",
        card: "hsla(60, 6%, 97%) ",
        divider: "hsla(0, 0%, 55%)",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("current", ["&:focus-within", "&:hover"]);
    }),
  ],
} satisfies Config;
