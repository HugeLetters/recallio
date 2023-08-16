import { env } from "@/env.mjs";
import { type Config } from "drizzle-kit";

export default {
  out: "./src/database/migrations",
  schema: "./src/database/schema.ts",
  driver: "mysql2",
  dbCredentials: { connectionString: env.DATABASE_URL },
  breakpoints: true,
} satisfies Config;
