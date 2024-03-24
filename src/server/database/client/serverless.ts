import { env } from "@/server/env/index.mjs";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "libsql-stateless-easy";

const connection = createClient({ url: env.DATABASE_HTTPS_URL, authToken: env.DATABASE_TOKEN });

export const db = drizzle(connection);
export type ServerlessDatabaseClient = typeof db;
