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
      .$defaultFn(() => crypto.randomUUID().slice(0, 11)),
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
    isPrivateIndex: index("review_is_private_idx").on(table.isPrivate),
    productReviewListByUpdatedIndex: index("review_product_review_list_by_updated_index").on(
      table.barcode,
      table.isPrivate,
      table.updatedAt,
    ),
    productReviewListByRatingIndex: index("review_product_review_list_by_rating_index").on(
      table.barcode,
      table.isPrivate,
      table.rating,
    ),
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
    // todo - check if I could just switch userId and barcode order and remove barcode index
    compoundKey: primaryKey({ columns: [table.userId, table.barcode, table.category] }),
    reviewReference: foreignKey({
      columns: [table.barcode, table.userId],
      foreignColumns: [review.barcode, review.userId],
    })
      .onDelete("cascade")
      .onUpdate("restrict"),
    barcodeIndex: index("reviews_to_categories_barcode_index").on(table.barcode),
  }),
);

export const productMeta = sqliteTable("product_meta", {
  barcode: text("barcode", { length: barcodeLengthMax }).primaryKey(),
  publicReviewCount: int("public_review_count").default(0).notNull(),
  publicTotalRating: int("public_total_rating").default(0).notNull(),
});
