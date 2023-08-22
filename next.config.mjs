/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");
import BundleAnalyzer from "@next/bundle-analyzer";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  images: {
    remotePatterns: [
      { hostname: "avatars.githubusercontent.com", pathname: "/u/*" },
      { hostname: "cdn.discordapp.com", pathname: "/avatars/*" },
      { hostname: "*.googleusercontent.com", pathname: "/a/*" },
      { hostname: "media.licdn.com", pathname: "**" },
    ],
  },
};

export default function NextConfig() {
  return BundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(config);
}
