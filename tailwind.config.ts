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
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("current", ["&:focus-within", "&:hover"]);
    }),
  ],
} satisfies Config;
