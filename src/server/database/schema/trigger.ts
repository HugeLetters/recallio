import type { NonEmptyArray } from "@/utils/array";
import type { StrictExclude, StrictExtract } from "@/utils/type";
import type { Query, SQLWrapper } from "drizzle-orm";
import { eq, ne, sql } from "drizzle-orm";
import type { SQLiteTableWithColumns, TableConfig } from "drizzle-orm/sqlite-core";
import { SQLiteSyncDialect, alias } from "drizzle-orm/sqlite-core";
import { caseWhen, space } from "./utils";

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
  when?: (row: TriggerRowData<TType, TConfig>) => SQLWrapper;
  /** WHat operation to perform when trigger activates */
  do: (row: TriggerRowData<TType, TConfig>) => SQLWrapper;
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
const breakpoint = sql`--> statement-breakpoint\n`;

// todo - builder pattern!

export function createTrigger<TType extends TriggerType, TConfig extends TableConfig>(
  data: TriggerData<TType, TConfig>,
) {
  return sql.join(
    [createDropTriggerStatement(data.name), createTriggerStatement(data)],
    breakpoint,
  );
}

export function createMigration(...queryList: NonEmptyArray<SQLWrapper>) {
  return sqlite.sqlToQuery(sql.join(queryList, breakpoint));
}

function createDropTriggerStatement(name: string) {
  return sql.join([sql`DROP TRIGGER IF EXISTS`, sql.identifier(name)], space).append(endLine);
}

function createTriggerStatement(data: TriggerData) {
  const newTable = alias(data.on, "new");
  const oldTable = alias(data.on, "old");

  return sql
    .join(
      [
        sql`CREATE TRIGGER`,
        sql.identifier(data.name),
        sql`AFTER`,
        sql.raw(data.type),
        data.type === "UPDATE" && data.of
          ? sql.join([sql`OF`, sql.identifier(data.of.name)], space)
          : undefined,
        sql`ON`,
        data.on,
        data.when
          ? sql.join(
              [sql`FOR EACH ROW WHEN`, data.when({ newRow: newTable, oldRow: oldTable }).getSQL()],
              space,
            )
          : undefined,
        sql`BEGIN`,
        data.do({ newRow: newTable, oldRow: oldTable }).getSQL(),
        endLine,
        sql`END`,
      ].filter(Boolean),
      space,
    )
    .append(endLine);
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

