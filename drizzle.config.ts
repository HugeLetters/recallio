import "dotenv/config";
import { env } from "@/env";
import type { Config } from "drizzle-kit";

export default {
  out: "./src/server/database/migrations",
  schema: "./src/server/database/schema/*",
  driver: "mysql2",
  dbCredentials: { connectionString: env.DATABASE_URL },
  breakpoints: true,
} satisfies Config;
