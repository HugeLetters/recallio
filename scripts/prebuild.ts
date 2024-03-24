import { authRoutesPlugin } from "webpack/auth-routes.mjs";
import fileCleanupCron from "./cron/file-cleanup";
import migrate from "./database/migration/apply";
import generateSchema from "./database/migration/generate";
import { execAsync } from "./utils";

export default async function main() {
  return await Promise.all([
    migrateSchema(),
    generateRouteTypes(),
    fileCleanupCron(),
    authRoutesPlugin(false).apply(),
  ]);
}

async function migrateSchema() {
  await generateSchema();
  await migrate();
}

function generateRouteTypes() {
  return execAsync("pnpm nextjs-routes").then(console.log).catch(console.error);
}
