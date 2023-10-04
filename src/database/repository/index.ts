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
  sql,
  type InferInsertModel,
  type SQL,
} from "drizzle-orm";
import { type MySqlTable, type MySqlUpdateSetSource } from "drizzle-orm/mysql-core";
import { db } from "..";

type InsertValue<T extends MySqlTable> = InferInsertModel<T>;
type UpdateValue<T extends MySqlTable> = MySqlUpdateSetSource<T>;
export type WhereQuery<T extends MySqlTable> = (
  table: T,
  operators: typeof OPERATORS,
  DB: typeof db
) => SQL | undefined;

const OPERATORS = { eq, gt, lt, isNull, inArray, exists, between, like, not, and, or };

export abstract class Repository<T extends MySqlTable> {
  protected db = db;
  protected operators = OPERATORS;
  constructor(public table: T) {}
  // context allows me to pass in transaction context instead of db
  // empty arrays are actually a no-go in Drizzle
  create(value: InsertValue<T> | [InsertValue<T>, ...InsertValue<T>[]], context = db) {
    // values as an array because of a TS limitation with handling union in function overloads
    return context.insert(this.table).values(Array.isArray(value) ? value : [value]);
  }
  findFirst(query: WhereQuery<T>) {
    return this.findMany(query)
      .limit(1)
      .then((x) => x[0]);
  }
  findMany(query: WhereQuery<T>) {
    return this.db.select().from(this.table).where(query(this.table, this.operators, this.db));
  }
  delete(query: WhereQuery<T>) {
    return this.db.delete(this.table).where(query(this.table, this.operators, this.db));
  }
  update(value: UpdateValue<T>, query: WhereQuery<T>) {
    return this.db.update(this.table).set(value).where(query(this.table, this.operators, this.db));
  }
  count(query: WhereQuery<T>) {
    return this.db
      .select({ count: sql<string>`count(*)`.mapWith((x) => +x) })
      .from(this.table)
      .where(query(this.table, this.operators, this.db))
      .limit(1)
      .then((x) => x[0]?.count ?? 0);
  }
}
