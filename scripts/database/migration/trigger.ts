import { Trigger, breakpoint, createDropTriggerStatement } from "@/server/database/schema/trigger";
import { filterMap, filterOut, mapFilter } from "@/utils/array/filter";
import type { Query, SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execAsync } from "scripts/utils";

export default function main() {
  const triggers = getTriggers();
  const dropPreviousTriggers = getPreviousTriggers().then((triggers) =>
    triggers.map(createDropTriggerStatement),
  );
  const migrationSql = Promise.all([dropPreviousTriggers, triggers]).then(
    ([prevTriggers, triggers]) =>
      createMigration(...prevTriggers, ...triggers.map((trigger) => trigger.statement)),
  );
  const migration = migrationSql.then(serializeQuery);
  const migrationFilePath = generateCustomMigrationFile();
  return Promise.all([migrationFilePath, migration]).then(([path, migration]) =>
    writeFile(path, migration),
  );
}

const schemaDirectory = "./src/server/database/schema";
function getTriggers() {
  return readdir(schemaDirectory, { recursive: true })
    .then((files) =>
      filterMap(
        files,
        (file, b) => (file.endsWith(".ts") || file.endsWith(".js") ? file : b),
        (file) => resolve(schemaDirectory, file),
      ),
    )
    .then((files) => Promise.all(files.map((file) => import(file))))
    .then((modules: unknown[]) =>
      filterOut(
        modules.flatMap((module) => module && Object.values(module)),
        (value, b) => (value instanceof Trigger ? value : b),
      ),
    );
}

const migrationsDirectory = "./database/migrations";
const triggerNameRegExp = /CREATE TRIGGER\s*['"`]?(\w+)['"`]?/g;
function getPreviousTriggers() {
  return readdir(migrationsDirectory)
    .then((files) =>
      filterMap(
        files,
        (file, b) => (file.endsWith(".sql") ? file : b),
        (file) => resolve(migrationsDirectory, file),
      ),
    )
    .then((files) => Promise.all(files.map((file) => readFile(file, "utf-8"))))
    .then((migrations) =>
      migrations.flatMap((migration) =>
        mapFilter(
          [...migration.matchAll(triggerNameRegExp)],
          (match) => match[1],
          (match, b) => match ?? b,
        ),
      ),
    );
}

function generateCustomMigrationFile() {
  return execAsync("pnpm drizzle-kit generate:sqlite --custom").then((stdout) => {
    const file = stdout.match(/Your SQL migration file.+migrations\/(.+\.sql)/)?.[1];
    if (!file) throw Error("Could not resolve migration file path");
    return resolve(migrationsDirectory, file);
  });
}

const sqlite = new SQLiteSyncDialect();
function createMigration(...statements: Array<SQL>) {
  return sqlite.sqlToQuery(sql.join(statements, breakpoint));
}

function serializeQuery(query: Query) {
  return `${query.sql
    .split("?")
    .map((chunk, i) => {
      if (!chunk) return "";

      if (!(i in query.params)) return chunk;
      const param = query.params[i];

      const stringified = typeof param === "string" ? `"${param}"` : param;
      return `${chunk}${String(stringified)}`;
    })
    .join("")}`;
}
