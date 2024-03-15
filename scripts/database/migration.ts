import { db } from "@/server/database";
import { migrate } from "drizzle-orm/libsql/migrator";

(async () => {
  await migrate(db, { migrationsFolder: "./database/migrations" });
})().catch(console.error);
