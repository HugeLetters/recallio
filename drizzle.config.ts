import "dotenv/config";

import { env } from "@/server/env/index.mjs";
import type { Config } from "drizzle-kit";

export default {
  out: "./database/migrations",
  schema: "./src/server/database/schema/*",
  driver: "turso",
  dbCredentials: { url: env.DATABASE_URL, authToken: env.DATABASE_TOKEN },
  breakpoints: true,
} satisfies Config;
