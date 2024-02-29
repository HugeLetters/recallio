import { db } from "@/server/database";
import { migrate } from "drizzle-orm/planetscale-serverless/migrator";

(async () => {
  await migrate(db, { migrationsFolder: "./src/server/database/migrations" });
})().catch(console.error);
