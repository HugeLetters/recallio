import type { StrictExclude, StrictExtract } from "@/utils/type";
import type { Query, SQL, SQLWrapper } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { BuildAliasTable, SQLiteTable } from "drizzle-orm/sqlite-core";
import { SQLiteSyncDialect, alias } from "drizzle-orm/sqlite-core";
import { space } from "./utils";

type TableColumn<TTable extends SQLiteTable> = TTable["_"]["columns"][keyof TTable["_"]["columns"]];

type TriggerType = "INSERT" | "UPDATE" | "DELETE";
type TriggerRow<TType extends TriggerType, TTable extends SQLiteTable> = Record<
  TType extends StrictExclude<TriggerType, "DELETE"> ? "newRow" : never,
  BuildAliasTable<TTable, "new">
> &
  Record<
    TType extends StrictExclude<TriggerType, "INSERT"> ? "oldRow" : never,
    BuildAliasTable<TTable, "old">
  >;

type BaseTriggerData<TType extends TriggerType, TTable extends SQLiteTable> = {
  /** Trigger name */
  name: string;
  /** On which operations should trigger activate */
  type: TType;
  /** On which tables should trigger activate */
  on: TTable;
  /** Condition when trigger should activate */
  when?: (row: TriggerRow<TType, TTable>) => SQLWrapper;
  /** WHat operation to perform when trigger activates */
  do: (row: TriggerRow<TType, TTable>) => SQLWrapper;
};

interface UpdateTriggerData<TTable extends SQLiteTable> extends BaseTriggerData<"UPDATE", TTable> {
  /** On which column of `on` table should trigger activate */
  of?: TableColumn<TTable>;
}

type TriggerData<
  TType extends TriggerType = TriggerType,
  TTable extends SQLiteTable = SQLiteTable,
> =
  TType extends StrictExtract<TriggerType, "UPDATE">
    ? UpdateTriggerData<TTable>
    : BaseTriggerData<TType, TTable>;

const sqlite = new SQLiteSyncDialect();
const endLine = sql`;`;
const newLine = sql`\n`;
const tab = sql`\t`;
const breakpoint = sql`--> statement-breakpoint`.append(newLine);

// todo - script to generate trigger migrations
// #1 - scan all migration files for trigger creations and then drop all of them
// #2 - regenerate all triggers

export class Trigger<
  TType extends TriggerType = TriggerType,
  TTable extends SQLiteTable = SQLiteTable,
> {
  statement: SQL;

  constructor(data: TriggerData<TType, TTable>) {
    const dropStatement = join(
      [sql`DROP TRIGGER IF EXISTS`, sql.identifier(data.name)],
      space,
    ).append(endLine);

    const triggerTable = join(
      [
        sql`AFTER`,
        sql.raw(data.type),
        data.type === "UPDATE" && data.of
          ? join([sql`OF`, sql.identifier(data.of.name)], space)
          : undefined,
        sql`ON`,
        data.on,
      ],
      space,
    );

    const newTable = alias(data.on, "new");
    const oldTable = alias(data.on, "old");
    const triggerCondition = data.when
      ? join([
          tab,
          join(
            [sql`FOR EACH ROW WHEN`, data.when({ newRow: newTable, oldRow: oldTable }).getSQL()],
            space,
          ),
        ])
      : undefined;

    const createStatement = join(
      [
        join([sql`CREATE TRIGGER`, sql.identifier(data.name)], space),
        join([tab, triggerTable]),
        triggerCondition,
        sql`BEGIN`,
        join([tab, data.do({ newRow: newTable, oldRow: oldTable }).getSQL(), endLine]),
        sql`END`,
      ],
      newLine,
    ).append(endLine);

    this.statement = join([dropStatement, createStatement], breakpoint);
  }
}

function createMigration(...queryList: Array<Trigger>) {
  return sqlite.sqlToQuery(
    join(
      queryList.map((trigger) => trigger.statement),
      breakpoint,
    ),
  );
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

const join: typeof sql.join = function (chunks, separator) {
  return sql.join(chunks.filter(Boolean), separator);
};
