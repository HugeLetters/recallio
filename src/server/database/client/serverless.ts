import { env } from "@/server/env/index.mjs";
import { isDev } from "@/utils";
import { createClient as createStatefulClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { createClient as createServerlessClient } from "libsql-stateless-easy";

const createClient = !isDev ? createServerlessClient : createStatefulClient;
const connection = createClient({ url: env.DATABASE_HTTPS_URL, authToken: env.DATABASE_TOKEN });

export const db = drizzle(connection);
export type ServerlessDatabaseClient = typeof db;
