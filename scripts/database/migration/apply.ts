import { db } from "@/server/database";
import { migrate } from "drizzle-orm/libsql/migrator";

export default async function main() {
  return await migrate(db, { migrationsFolder: "./database/migrations" });
}
