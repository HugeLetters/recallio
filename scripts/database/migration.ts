import { db } from "@/database";
import { migrate } from "drizzle-orm/planetscale-serverless/migrator";

(async () => {
  await migrate(db, { migrationsFolder: "./src/database/migrations" });
})().catch(console.error);
