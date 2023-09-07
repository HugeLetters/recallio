import { getTableColumns, sql, type InferInsertModel } from "drizzle-orm";
import type { MySqlUpdateSetSource } from "drizzle-orm/mysql-core";
import { Repository, type WhereQuery } from "..";
import { category, productName, review, reviewsToCategories } from "../../schema/product";

class ProductNameRepository<T extends typeof productName> extends Repository<T> {}
export const productNameRepository = new ProductNameRepository(productName);

class CategoryRepository<T extends typeof category> extends Repository<T> {}
export const categoryRepository = new CategoryRepository(category);

class ReviewRepository<T extends typeof review> extends Repository<T> {
  async createWithCategories(
    reviewValue: Parameters<(typeof this)["create"]>[0] & InferInsertModel<typeof review>,
    categories: string[] | undefined
  ) {
    return this.db
      .transaction(async (tx) => {
        const newReview = await this.create(reviewValue, tx)
          .onDuplicateKeyUpdate({
            // The type is correct - TS doesn't understand this w/o assertion and I dunnu why, probably the type is too complex
            set: reviewValue as MySqlUpdateSetSource<typeof review>,
          })
          .catch((e) => {
            console.error(e);
            throw Error("Error saving the review");
          });
        if (!categories) return newReview;

        await categoryRepository
          .create(
            categories.map((category) => ({ name: category })),
            tx
          )
          .onDuplicateKeyUpdate({ set: { name: sql`${categoryRepository.table.name}` } })
          .catch((e) => {
            console.error(e);
            throw Error("Error saving categories for review");
          });

        const categoriesForReview = categories.map((category) => ({
          barcode: reviewValue.barcode,
          userId: reviewValue.userId,
          category,
        }));
        const { and, eq } = this.operators;

        await tx
          .delete(reviewsToCategories)
          .where(
            and(
              eq(reviewsToCategories.userId, reviewValue.userId),
              eq(reviewsToCategories.barcode, reviewValue.barcode)
            )
          );

        await tx
          .insert(reviewsToCategories)
          .values(categoriesForReview)
          .onDuplicateKeyUpdate({
            set: {
              barcode: sql`${reviewsToCategories.barcode}`,
              category: sql`${reviewsToCategories.category}`,
              userId: sql`${reviewsToCategories.userId}`,
            },
          })
          .catch((e) => {
            console.error(e);
            throw Error("Error linking categories for review");
          });

        return newReview;
      })
      .catch((e: Error) => {
        console.error(e);
        throw e;
      });
  }

  #reviewWithCategoriesCols = (() => {
    const { barcode: _, userId: __, ...review } = getTableColumns(this.table);

    return {
      ...review,
      categories: sql<string[]>`JSON_ARRAYAGG(${reviewsToCategories.category})`,
    };
  })();
  async findFirstWithCategories(query: WhereQuery<T>) {
    const { eq, and } = this.operators;

    return this.db
      .select(this.#reviewWithCategoriesCols)
      .from(this.table)
      .where(query(this.table, this.operators))
      .leftJoin(
        reviewsToCategories,
        and(
          eq(this.table.userId, reviewsToCategories.userId),
          eq(this.table.barcode, reviewsToCategories.barcode)
        )
      )
      .groupBy(this.table.barcode, this.table.userId)
      .limit(1)
      .then((x) => x[0]);
  }
}
export const reviewRepository = new ReviewRepository(review);
