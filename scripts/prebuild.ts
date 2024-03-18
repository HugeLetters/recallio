import migrate from "./database/migration/apply";
import generateSchema from "./database/migration/generate";
import fileCleanupCron from "./cron/file-cleanup";
import { execAsync } from "./utils";

export default async function main() {
  return await Promise.all([migrateSchema(), generateRouteTypes(), fileCleanupCron()]);
}

async function migrateSchema() {
  await generateSchema();
  await migrate();
}

function generateRouteTypes() {
  return execAsync("pnpm nextjs-routes").then(console.log).catch(console.error);
}
