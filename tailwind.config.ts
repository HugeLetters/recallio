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
    plugin(({ addVariant, addUtilities, matchVariant, matchUtilities, theme, addComponents }) => {
      addVariant("selected", "&:is(:focus-within,:hover)");
      addVariant("group-selected", ":merge(.group):is(:focus-within,:hover) &");
      addVariant("peer-selected", ":merge(.peer):is(:focus-within,:hover) ~ &");
      matchVariant("not", (value) => `&:not(${value})`);

      addComponents({
        ".disabled": {
          cursor: "default",
        },
        ".btn": {
          borderRadius: "0.75rem",
          padding: "0.875rem 0.625rem",
          transitionProperty: "transform, filter, color, background-color, outline-color",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          transitionDuration: "200ms",
          "&:active:not([class*=disabled])": {
            "--tw-brightness": "brightness(1.1)",
            filter:
              "var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)",
            "@media (prefers-reduced-motion: no-preference)": {
              "--tw-scale-x": ".95",
              "--tw-scale-y": ".95",
              transform:
                "translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))",
            },
          },
        },
        ".primary": {
          "--tw-bg-opacity": "1",
          backgroundColor: "hsla(122, 39%, 49%, var(--tw-bg-opacity))",
          "--tw-text-opacity": "1",
          color: "rgb(255 255 255 / var(--tw-text-opacity))",
        },
        ".ghost": {
          "--tw-bg-opacity": "1",
          backgroundColor: "rgb(245 245 245 / var(--tw-bg-opacity))",
          "--tw-text-opacity": "1",
          color: "rgb(26 46 5 / var(--tw-text-opacity))",
          outline: "2px solid rgb(163 163 163 / 0.3)",
          "&:focus-within": {
            outlineColor: "rgb(163 163 163 / 0.7)",
          },
        },
        ".destructive": {
          backgroundColor: "rgb(153 27 27 / 0.1)",
          color: "rgb(153 27 27 / 0.8)",
          outline: "2px solid transparent",
          "&:focus-within": {
            outlineColor: "rgb(153 27 27 / 0.4)",
          },
        },
      });

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
    }),
  ],
} satisfies Config;
