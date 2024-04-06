import type { StrictExclude, StrictExtract } from "@/utils/type";
import type { Query, SQLChunk } from "drizzle-orm";
import { eq, ne, sql } from "drizzle-orm";
import type { SQLiteTableWithColumns, TableConfig } from "drizzle-orm/sqlite-core";
import { SQLiteSyncDialect, alias } from "drizzle-orm/sqlite-core";

type TableConfigColumn<TConfig extends TableConfig> = TConfig["columns"][keyof TConfig["columns"]];

type TriggerType = "INSERT" | "UPDATE" | "DELETE";
type TriggerRowData<TType extends TriggerType, TConfig extends TableConfig> = {
  [K in
    | (TType extends StrictExclude<TriggerType, "DELETE"> ? "newRow" : never)
    | (TType extends StrictExclude<TriggerType, "INSERT"> ? "oldRow" : never)]: TConfig["columns"];
};

type BaseTriggerData<TType extends TriggerType, TConfig extends TableConfig> = {
  /** Trigger name */
  name: string;
  /** On which operations should trigger activate */
  type: TType;
  /** On which tables should trigger activate */
  on: SQLiteTableWithColumns<TConfig>;
  /** Condition when trigger should activate */
  when?: (row: TriggerRowData<TType, TConfig>) => SQLChunk;
  /** WHat operation to perform when trigger activates */
  do: (row: TriggerRowData<TType, TConfig>) => SQLChunk;
};

interface UpdateTriggerData<TConfig extends TableConfig>
  extends BaseTriggerData<"UPDATE", TConfig> {
  /** On which column of `on` table should trigger activate */
  of?: TableConfigColumn<TConfig>;
}

type TriggerData<
  TType extends TriggerType = TriggerType,
  TConfig extends TableConfig = TableConfig,
> =
  TType extends StrictExtract<TriggerType, "UPDATE">
    ? UpdateTriggerData<TConfig>
    : BaseTriggerData<TType, TConfig>;

const sqlite = new SQLiteSyncDialect();
const endLine = sql`;`;

// todo - builder pattern!

export function createTrigger<TType extends TriggerType, TConfig extends TableConfig>(
  data: TriggerData<TType, TConfig>,
) {
  return sqlite.sqlToQuery(
    sql
      .join(
        [createDropTriggerStatement(data.name), createTriggerStatement(data)],
        sql`${endLine}--> statement-breakpoint\n`,
      )
      .append(endLine),
  );
}

function createDropTriggerStatement(name: string) {
  return sql`DROP TRIGGER IF EXISTS ${sql.identifier(name)}`;
}

function createTriggerStatement(data: TriggerData) {
  const newTable = alias(data.on, "new");
  const oldTable = alias(data.on, "old");

  return sql.join(
    [
      sql`CREATE TRIGGER ${sql.identifier(data.name)}`,
      sql`AFTER ${sql.raw(data.type)}`,
      data.type === "UPDATE" ? sql` OF ${data.of}` : undefined,
      sql`ON ${data.on}`,
      data.when
        ? sql`FOR EACH ROW WHEN ${data.when({ newRow: newTable, oldRow: oldTable })}`
        : undefined,
      sql`BEGIN ${data.do({ newRow: newTable, oldRow: oldTable })}; END`,
    ],
    sql` `,
  );
}

function stringifyQuery(query: Query) {
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

