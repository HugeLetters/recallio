import { type Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      height: { screen: "100dvh" },
      minHeight: { screen: "100dvh" },
      maxWidth: { app: "450px" },
      fontFamily: { lato: ["var(--font-lato, Lato)", ...defaultTheme.fontFamily.sans] },
      colors: {
        app: {
          gold: "hsla(47, 87%, 56%)",
          green: "hsla(122, 39%, 49%)",
        },
      },
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
    plugin(({ addVariant, addUtilities, matchVariant, matchUtilities, theme }) => {
      addVariant("selected", "&:is(:focus-within,:hover)");
      addVariant("group-selected", ":merge(.group):is(:focus-within,:hover) &");
      addVariant("peer-selected", ":merge(.peer):is(:focus-within,:hover) ~ &");
      matchVariant("not", (value) => `&:not(${value})`);

      // #region shadow around
      const shadowAroundOpacity = "--tw-drop-shadow-around-opacity";
      const shadowAroundRadius = "--tw-drop-shadow-around-radius";
      addUtilities({
        ".shadow-around": {
          "--tw-drop-shadow": `drop-shadow(0 0 var(${shadowAroundRadius}) rgb(0 0 0 / var(${shadowAroundOpacity})))`,
          filter:
            "var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)",
        },
      });
      matchUtilities(
        {
          ["sa-o"](value) {
            return { [shadowAroundOpacity]: `${value}` };
          },
        },
        { values: theme("opacity") }
      );
      matchUtilities(
        {
          ["sa-r"](value) {
            return { [shadowAroundRadius]: `${value}` };
          },
        },
        { values: theme("width") }
      );
      // #endregion
    }),
  ],
} satisfies Config;
