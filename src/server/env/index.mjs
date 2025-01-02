import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
const DATABASE_URL = !isDev ? process.env.DATABASE_URL : "file:./database/db.sqlite";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DATABASE_HTTPS_URL: z
      .string()
      .min(1)
      .transform((str) => str.replace("libsql://", "https://")),
    DATABASE_TOKEN: z.string(),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production" ? z.string().min(1) : z.string().min(1).optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL
        ? z
            .string()
            .min(1)
            .transform((url) => `https://${url}`)
        : z.string().url(),
    ),
    // Add `.min(1) on ID and SECRET if you want to make sure they're not empty
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    LINKED_IN_CLIENT_ID: z.string(),
    LINKED_IN_CLIENT_SECRET: z.string(),
    UPLOADTHING_TOKEN: z.string(),
    UPSTASH_REDIS_REST_URL: z.string(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
    REDIS_URL: z.string(),
    QSTASH_TOKEN: z.string(),
    QSTASH_CURRENT_SIGNING_KEY: z.string(),
    QSTASH_NEXT_SIGNING_KEY: z.string(),
    NODEMAILER_PASSWORD: z.string(),
    NODEMAILER_EMAIL: z.string(),
  },

  //! To expose them to the client, prefix them with `NEXT_PUBLIC_`.
  client: {
    NEXT_PUBLIC_NODE_ENV: z.preprocess(
      (str) => process.env.VERCEL_ENV ?? str,
      z.enum(["development", "test", "preview", "production"]).default("development"),
    ),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: DATABASE_URL,
    DATABASE_HTTPS_URL: DATABASE_URL,
    DATABASE_TOKEN: process.env.DATABASE_TOKEN,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    LINKED_IN_CLIENT_ID: process.env.LINKED_IN_CLIENT_ID,
    LINKED_IN_CLIENT_SECRET: process.env.LINKED_IN_CLIENT_SECRET,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    REDIS_URL: process.env.REDIS_URL,
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
    NODEMAILER_PASSWORD: process.env.NODEMAILER_PASSWORD,
    NODEMAILER_EMAIL: process.env.NODEMAILER_EMAIL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
