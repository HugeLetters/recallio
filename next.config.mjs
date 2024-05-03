/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/server/env/index.mjs");

import withBundleAnalyzer from "@next/bundle-analyzer";
import setupSerwist from "@serwist/next";
import setupNextRoutes from "nextjs-routes/config";
import { FileSystemIconLoader } from "unplugin-icons/loaders";
import unpluginIcons from "unplugin-icons/webpack";
import { authRoutesPlugin } from "./webpack/auth-routes.mjs";

const withRoutes = setupNextRoutes();
// todo - add manual SW registration maybe??
const withSerwistInit = setupSerwist({
  swDest: "public/recallio-sw.js",
  swUrl: "recallio-sw.js",
  swSrc: "./src/sw/index.ts",
  reloadOnOnline: false,
});

/** @type {import("next").NextConfig} */
const config = {
  swcMinify: true,
  reactStrictMode: true,
  redirects() {
    return Promise.resolve([{ source: "/", destination: "/scan", permanent: true }]);
  },
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
      { hostname: "uploadthing.com", pathname: "/f/**" },
      { hostname: "utfs.io", pathname: "/f/**" },
      { hostname: "picsum.photos", pathname: "/seed/**" },
      { hostname: "loremflickr.com" },
      { hostname: "cloudflare-ipfs.com", pathname: "/ipfs/**" },
    ],
  },
  /**
   * @param {{plugins: unknown[]}} config
   * @returns {typeof config}
   */
  webpack(config, ctx) {
    config.plugins.push(
      unpluginIcons({
        compiler: "jsx",
        jsx: "react",
        autoInstall: true,
        scale: 1,
        customCollections: {
          custom: FileSystemIconLoader("./src/assets/icons"),
        },
      }),
    );
    // can't run this during build because type-checking will fail before this plugin does its job
    // this plugin is executed in `prebuild` script instead
    if (ctx.dev) {
      config.plugins.push(authRoutesPlugin(ctx.dev));
    }
    return config;
  },
  experimental: {
    esmExternals: false,
  },
  typescript: { ignoreBuildErrors: !!process.env.NO_TSC },
};

export default function NextConfig() {
  return withSerwistInit(
    withRoutes(withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(config)),
  );
}
