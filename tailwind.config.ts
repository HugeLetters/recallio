import type { DistributedRecord } from "@/utils/type";
import type { CSSProperties } from "react";
import { type Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

const shadowAroundOpacity = "--tw-drop-shadow-around-opacity";
const shadowAroundRadius = "--tw-drop-shadow-around-radius";
const animationDurationVar = "--tw-animation-duration";
const animationFunctionVar = "--tw-animation-function";

const appRedColor = defineColor(0, 39);
const appGreenColor = defineColor(122, 39);
const appGoldColor = defineColor(47, 87);

const slideUp = defineReversibleAnimation("slide-up", {
  from: { translate: "0 70%", opacity: "0" },
});
const slideLeft = defineReversibleAnimation("slide-left", {
  from: { translate: "30% 0", opacity: "0" },
});
const fadeIn = defineReversibleAnimation("fade-in", { from: { opacity: "0" } });
const scaleIn = defineReversibleAnimation("scale-in", { from: { scale: "0.7", opacity: "0" } });
const expandX = defineReversibleAnimation("expand-x", { from: { scale: "0 1" } });
const animations = groupAnimations(slideUp, slideLeft, fadeIn, scaleIn, expandX);

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      maxWidth: { app: "450px" },
      fontFamily: { lato: ["var(--font-lato, Lato)", ...defaultTheme.fontFamily.sans] },
      colors: {
        app: {
          gold: appGoldColor,
          green: appGreenColor,
          red: appRedColor,
        },
      },
      animation: { ...animations.animation },
      keyframes: { ...animations.keyframes },
    },
  },
  plugins: [
    plugin(({ addVariant, addUtilities, matchVariant, matchUtilities, theme, addComponents }) => {
      addVariant("selected", "&:is(:focus-within,:hover)");
      addVariant("group-selected", ":merge(.group):is(:focus-within,:hover) &");
      addVariant("peer-selected", ":merge(.peer):is(:focus-within,:hover) ~ &");
      addVariant("focus-visible-within", [
        "&:is(:has(:focus-visible),:focus-visible)",
        "@supports not selector(:has(*)) {&:focus-within}",
      ]);
      matchVariant("not", (value) => `&:not(${value})`);
      matchVariant("nth", (value) => `&:nth-child(${value})`);
      matchVariant("nth-last", (value) => `&:nth-last-child(${value})`);

      addComponents({
        ".scrollbar-gutter": {
          "@media (pointer: fine), (pointer: none)": { scrollbarGutter: "stable" },
        },
        ".disabled": {
          cursor: "default",
        },
        ".btn": {
          borderRadius: "0.75rem",
          padding: "0.875rem 0.625rem",
          transitionProperty: "scale, transform, filter, color, background-color, outline-color",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          transitionDuration: "200ms",
          "&:active:not([class*=disabled])": {
            "--tw-brightness": "brightness(1.1)",
            filter:
              "var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)",
            "@media (prefers-reduced-motion: no-preference)": { scale: ".95" },
          },
        },
        ".primary": {
          backgroundColor: appGreenColor[500],
          color: "white",
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
          backgroundColor: appRedColor[100],
          color: appRedColor[550],
          outline: "2px solid transparent",
          "&:focus-within": {
            outlineColor: appRedColor[250],
          },
        },
      });

      addUtilities({
        ".shadow-around": {
          "--tw-drop-shadow": `drop-shadow(0 0 var(${shadowAroundRadius}) rgb(0 0 0 / var(${shadowAroundOpacity})))`,
          filter:
            "var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)",
        },
        ".animate-reverse": { animationDirection: "reverse" },
      });
      matchUtilities(
        {
          "animate-duration"(value) {
            return { [animationDurationVar]: String(value) };
          },
        },
        { values: theme("transitionDuration") },
      );
      matchUtilities(
        {
          "animate-function"(value) {
            return { [animationFunctionVar]: String(value) };
          },
        },
        {
          values: {
            "ease-out": "cubic-bezier(.32,.52,.36,.99)",
            linear: "linear",
          },
        },
      );
      matchUtilities(
        {
          "animation-play-state"(value) {
            return { animationPlayState: String(value) };
          },
        },
        { values: { play: "running", pause: "paused" } },
      );
      matchUtilities(
        {
          "animation-fill-mode"(value) {
            return { animationFillMode: String(value) };
          },
        },
        { values: { none: "none", forward: "forwards", backward: "backwards", both: "both" } },
      );
      matchUtilities(
        {
          ["sa-o"](value) {
            return { [shadowAroundOpacity]: String(value) };
          },
        },
        { values: { ...theme("opacity"), 15: "0.15" } },
      );
      matchUtilities(
        {
          ["sa-r"](value) {
            return { [shadowAroundRadius]: String(value) };
          },
        },
        { values: theme("width") },
      );
    }),
  ],
} satisfies Config;

type Keyframes = DistributedRecord<
  "from" | "to" | `${number}%`,
  CSSProperties & Record<string, string>
>;
type Animation = {
  animation: Record<string, string>;
  keyframes: Record<string, Keyframes>;
};
function defineAnimation(animationName: string, keyframes: Keyframes): Animation {
  return {
    animation: {
      [animationName]: `${animationName} var(${animationDurationVar}, 200ms) var(${animationFunctionVar}, ease-in-out)`,
    },
    keyframes: { [animationName]: keyframes },
  };
}

function defineReversibleAnimation(animationName: string, keyframes: Keyframes): Animation {
  function reverseStep(step: string) {
    if (step === "to") return "from";
    if (step === "from") return "to";

    const match = step.match(/\d+(?=%$)/);
    if (!match) return step;

    const [percentage] = match;
    return `${100 - +percentage}%`;
  }

  const animation = defineAnimation(animationName, keyframes);
  const reverseAnimation = defineAnimation(
    `${animationName}-reverse`,
    Object.fromEntries(
      Object.entries(keyframes).map(([step, transform]) => [reverseStep(step), transform]),
    ),
  );
  return {
    animation: { ...animation.animation, ...reverseAnimation.animation },
    keyframes: { ...animation.keyframes, ...reverseAnimation.keyframes },
  };
}

function groupAnimations(...animations: Animation[]): Animation {
  return {
    animation: Object.fromEntries(
      animations.flatMap((animation) => Object.entries(animation.animation)),
    ),
    keyframes: Object.fromEntries(
      animations.flatMap((animation) => Object.entries(animation.keyframes)),
    ),
  };
}

type ColorStep = "1" | "2" | "3" | "5" | "6" | "7" | "8" | "9";
type ColorVariant = `${ColorStep}00` | `${ColorStep}50` | "50";
type Color = Record<ColorVariant, string>;
function defineColor(hue: number, saturation: number) {
  return Object.fromEntries(
    Array.from({ length: 19 }, (_, i) => [
      (i + 1) * 50,
      `hsl(${hue} ${saturation}% ${((100 / 20) * (19 - i)).toFixed(0)}%)`,
    ]),
  ) as Color;
}
