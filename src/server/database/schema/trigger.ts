import type { StrictExclude, StrictExtract } from "@/utils/type";
import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { SQLiteTableWithColumns, TableConfig } from "drizzle-orm/sqlite-core";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

type TableConfigColumn<TConfig extends TableConfig> = TConfig["columns"][keyof TConfig["columns"]];

type TriggerType = "INSERT" | "UPDATE" | "DELETE";
type TriggerRowData<TType extends TriggerType, TConfig extends TableConfig> = {
  [K in
    | (TType extends StrictExclude<TriggerType, "DELETE"> ? "new" : never)
    | (TType extends StrictExclude<TriggerType, "INSERT"> ? "old" : never)]: TConfig["columns"];
};

type BaseTriggerData<TType extends TriggerType, TConfig extends TableConfig> = {
  /** Trigger name */
  name: string;
  /** On which operations should trigger activate */
  type: TType;
  /** On which tables should trigger activate */
  on: SQLiteTableWithColumns<TConfig>;
  /** Condition when trigger should activate */
  when?: SQL | ((row: TriggerRowData<TType, TConfig>) => SQL<boolean>);
  /** WHat operation to perform when trigger activates */
  do: SQL | ((row: TriggerRowData<TType, TConfig>) => SQL);
};

interface UpdateTriggerData<TConfig extends TableConfig>
  extends BaseTriggerData<"UPDATE", TConfig> {
  /** On which column of `on` table should trigger activate */
  of?: TableConfigColumn<TConfig>;
}

type TriggerData<TType extends TriggerType, TConfig extends TableConfig> =
  TType extends StrictExtract<TriggerType, "UPDATE">
    ? UpdateTriggerData<TConfig>
    : BaseTriggerData<TType, TConfig>;
