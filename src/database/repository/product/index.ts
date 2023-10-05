import { aggregateArrayColumn } from "@/database/utils";
import { nonEmptyArray, type StrictPick } from "@/utils";
import { asc, desc, getTableColumns, sql, type InferInsertModel } from "drizzle-orm";
import { Repository, type WhereQuery } from "..";
import { category, productName, review, reviewsToCategories } from "../../schema/product";

type ProductName = typeof productName;
class ProductNameRepository extends Repository<ProductName> {}
export const productNameRepository = new ProductNameRepository(productName);

type Category = typeof category;
class CategoryRepository extends Repository<Category> {}
export const categoryRepository = new CategoryRepository(category);

type Review = typeof review;
class ReviewRepository extends Repository<Review> {
  async createWithCategories(
    reviewValue: InferInsertModel<Review>,
    categories: string[] | undefined
  ) {
    return this.db
      .transaction(async (tx) => {
        // override updatedAt value with current time
        Object.assign(reviewValue, { updatedAt: new Date() } satisfies StrictPick<
          typeof reviewValue,
          "updatedAt"
        >);

        const reviewQuery = await this.create(reviewValue, tx)
          .onDuplicateKeyUpdate({ set: reviewValue })
          .catch((e) => {
            console.error(e);
            throw Error("Error saving the review");
          });
        if (!categories) return reviewQuery;

        const categoryValues = categories.map((category) => ({ name: category }));
        if (!nonEmptyArray(categoryValues)) return reviewQuery;

        await categoryRepository
          .create(categoryValues, tx)
          .onDuplicateKeyUpdate({ set: { name: sql`${categoryRepository.table.name}` } })
          .catch((e) => {
            console.error(e);
            throw Error("Error saving categories for review");
          });

        const { and, eq } = this.operators;

        await tx
          .delete(reviewsToCategories)
          .where(
            and(
              eq(reviewsToCategories.userId, reviewValue.userId),
              eq(reviewsToCategories.barcode, reviewValue.barcode)
            )
          );

        const categoriesForReview = categories.map((category) => ({
          barcode: reviewValue.barcode,
          userId: reviewValue.userId,
          category,
        }));
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

        return reviewQuery;
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
      categories: aggregateArrayColumn<string>(reviewsToCategories.category),
    };
  })();
  findFirstWithCategories(query: WhereQuery<Review>) {
    const { eq, and } = this.operators;

    return this.db
      .select(this.#reviewWithCategoriesCols)
      .from(this.table)
      .where(query(this.table, this.operators, this.db))
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

  #reviewSummaryCols = {
    barcode: this.table.barcode,
    name: this.table.name,
    imageKey: this.table.imageKey,
    rating: this.table.rating,
    categories: aggregateArrayColumn<string>(reviewsToCategories.category),
  };
  findManyReviewSummary(
    query: WhereQuery<Review>,
    options?: {
      page?: { cursor: number; limit: number };
      sort?: {
        by: keyof ReturnType<typeof getTableColumns<(typeof reviewRepository)["table"]>>;
        desc: boolean;
      };
    }
  ) {
    const { eq, and } = this.operators;
    let result = this.db
      .select(this.#reviewSummaryCols)
      .from(this.table)
      .where(query(this.table, this.operators, this.db))
      .leftJoin(
        reviewsToCategories,
        and(
          eq(this.table.userId, reviewsToCategories.userId),
          eq(this.table.barcode, reviewsToCategories.barcode)
        )
      )
      .groupBy(this.table.barcode, this.table.userId);

    if (!options) return result.then((x) => x);

    const { page, sort } = options;
    if (page) {
      result = result.limit(page.limit).offset(page.cursor * page.limit);
    }

    if (sort) {
      const direction = sort.desc ? desc : asc;
      result = result.orderBy(direction(this.table[sort.by]));
    }

    return result.then((x) => x);
  }
}
export const reviewRepository = new ReviewRepository(review);
