import { env } from "@/server/env/index.mjs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const connection = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_TOKEN });
export const db = drizzle(connection);
export type DatabaseClient = typeof db;
