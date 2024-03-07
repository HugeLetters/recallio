import { env } from "@/env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

// todo - migrate to turso buddy
const connection = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_TOKEN });

export const db = drizzle(connection);
export type DatabaseClient = typeof db;
