import { env } from "@/env";
import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

// todo - migrate to turso buddy
const connection = connect({ url: env.DATABASE_URL });

export const db = drizzle(connection);
export type DatabaseClient = typeof db;
