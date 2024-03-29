import {
  barcodeLengthMax,
  categoryLengthMax,
  productCommentLengthMax,
  productNameLengthMax,
} from "@/product/validation";
import { user, userIdLength } from "@/server/database/schema/user";
import { timestampColumn } from "@/server/database/schema/utils";
import { foreignKey, index, int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const review = sqliteTable(
  "review",
  {
    id: text("id", { length: 10 })
      .notNull()
      .unique()
      .$defaultFn(() => crypto.randomUUID().slice(0, 10)),
    userId: text("user_id", { length: userIdLength })
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    barcode: text("barcode", { length: barcodeLengthMax }).notNull(),
    name: text("name", { length: productNameLengthMax }).notNull(),
    rating: int("rating").notNull(),
    pros: text("pros", { length: productCommentLengthMax }),
    cons: text("cons", { length: productCommentLengthMax }),
    comment: text("comment", { length: productCommentLengthMax }),
    imageKey: text("image_key", { length: 255 }),
    updatedAt: timestampColumn("updated_at").notNull(),
    isPrivate: int("is_private", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.userId, table.barcode] }),
    barcodeIndex: index("review_barcode_index").on(table.barcode),
    nameIndex: index("review_name_index").on(table.name),
    ratingIndex: index("review_rating_index").on(table.rating),
    updatedAtIndex: index("review_updated_at_index").on(table.updatedAt),
    isPrivateIndex: index("review_is_private_index").on(table.isPrivate),
  }),
);
export type ReviewInsert = typeof review.$inferInsert;

export const category = sqliteTable("category", {
  name: text("name", { length: categoryLengthMax }).primaryKey(),
});

export const reviewsToCategories = sqliteTable(
  "reviews_to_categories",
  {
    userId: text("user_id", { length: userIdLength }).notNull(),
    barcode: text("barcode", { length: barcodeLengthMax }).notNull(),
    category: text("category", { length: categoryLengthMax })
      .notNull()
      .references(() => category.name, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.userId, table.barcode, table.category] }),
    reviewReference: foreignKey({
      columns: [table.barcode, table.userId],
      foreignColumns: [review.barcode, review.userId],
    })
      .onDelete("cascade")
      .onUpdate("restrict"),
    barcodeIndex: index("reviews_to_categories_barcode_index").on(table.barcode),
    categoryIndex: index("reviews_to_categories_category_index").on(table.category),
  }),
);
