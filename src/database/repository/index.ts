import {
  and,
  between,
  eq,
  exists,
  gt,
  inArray,
  isNull,
  like,
  lt,
  not,
  or,
  type InferModel,
  type SQL,
} from "drizzle-orm";
import { type MySqlTable, type MySqlUpdateSetSource } from "drizzle-orm/mysql-core";
import { db } from "..";

type InsertValue<T extends MySqlTable> = InferModel<T, "insert">;
type UpdateValue<T extends MySqlTable> = MySqlUpdateSetSource<T>;
export type WhereQuery<T extends MySqlTable> = (
  table: T,
  operators: typeof OPERATORS
) => SQL | undefined;

const OPERATORS = { eq, gt, lt, isNull, inArray, exists, between, like, not, and, or };

export abstract class Repository<T extends MySqlTable> {
  table;
  protected db = db;
  protected operators = OPERATORS;
  constructor(table: T) {
    this.table = table;
  }
  async create(value: InsertValue<T> | InsertValue<T>[]) {
    // values as an array because of a Drizzle bug where excess properties cause a crash on single insert
    await this.db.insert(this.table).values(Array.isArray(value) ? value : [value]);
  }
  findFirst(query: WhereQuery<T>) {
    return this.findMany(query)
      .limit(1)
      .then((x) => x[0]);
  }
  findMany(query: WhereQuery<T>) {
    return this.db.select().from(this.table).where(query(this.table, this.operators));
  }
  async delete(query: WhereQuery<T>) {
    await this.db.delete(this.table).where(query(this.table, this.operators));
  }
  async update(value: UpdateValue<T>, query: WhereQuery<T>) {
    await this.db.update(this.table).set(value).where(query(this.table, this.operators));
  }
}
