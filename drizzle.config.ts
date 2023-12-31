import "dotenv/config";
import { env } from "@/env.mjs";
import { type Config } from "drizzle-kit";

export default {
  out: "./src/database/migrations",
  schema: "./src/database/schema/*",
  driver: "mysql2",
  dbCredentials: { connectionString: env.DATABASE_URL },
  breakpoints: true,
} satisfies Config;
