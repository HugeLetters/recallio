import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/database/client/serverless";
import { query } from "@/server/database/query/aggregate";
import {
  category,
  productMeta,
  review,
  reviewsToCategories,
} from "@/server/database/schema/product";
import { averageProductRating } from "@/server/database/schema/product/sql";
import { throwExpectedError } from "@/server/error/trpc";
import { cacheProductNames, getProductNames } from "@/server/product/cache";
import { getScrapedProducts } from "@/server/product/scrapers";
import { createBarcodeSchema } from "@/server/product/validation";
import { getFileUrl } from "@/server/uploadthing";
import { mostCommon } from "@/utils/array";
import { and, eq, exists, gt, like } from "drizzle-orm";
import { z } from "zod";
import { getReviewList } from "./review-list";
import { getSummaryList } from "./summary-list";

const getSummary = publicProcedure
  .input(z.object({ barcode: createBarcodeSchema("Barcode is required to request product data") }))
  .query(({ input: { barcode } }) => {
    const categorySq = db
      .select({
        barcode: reviewsToCategories.barcode,
        categories: query.aggregate(reviewsToCategories.category, mostCommon(3)).as("categories"),
      })
      .from(reviewsToCategories)
      .where(
        and(
          eq(reviewsToCategories.barcode, barcode),
          exists(
            db
              .select()
              .from(review)
              .where(
                and(
                  eq(review.barcode, reviewsToCategories.barcode),
                  eq(review.userId, reviewsToCategories.userId),
                  eq(review.isPrivate, false),
                ),
              ),
          ),
        ),
      )
      .groupBy(reviewsToCategories.barcode)
      .as("category_subquery");

    return db
      .select({
        name: query.aggregate(review.name, (x) => mostCommon(1)(x)[0]!),
        image: query.map(query.min(review.imageKey), getFileUrl),
        categories: categorySq.categories,
        reviewCount: productMeta.publicReviewCount,
        rating: averageProductRating,
      })
      .from(review)
      .where(and(eq(review.barcode, barcode), eq(review.isPrivate, false)))
      .leftJoin(categorySq, eq(review.barcode, categorySq.barcode))
      .innerJoin(productMeta, eq(review.barcode, productMeta.barcode))
      .groupBy(review.barcode)
      .limit(1)
      .get()
      .then((summary) => summary ?? null);
  });

export const productRouter = createTRPCRouter({
  getSummaryList,
  getReviewList,
  getSummary,
  getNames: protectedProcedure
    .input(z.object({ barcode: createBarcodeSchema() }))
    .query(({ input: { barcode } }): Promise<string[]> => {
      return getProductNames(barcode)
        .then(async (cached) => {
          if (cached) return cached;

          const products = await getScrapedProducts(barcode);
          cacheProductNames(barcode, products).catch(console.error);
          return products;
        })
        .catch(throwExpectedError("Failed to retrieve suggested product names."));
    }),
  getCategoryList: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        filter: z.string(),
        limit: z.number(),
      }),
    )
    .query(({ input: { filter, cursor, limit } }) => {
      return db
        .select({ name: category.name })
        .from(category)
        .where(
          and(like(category.name, `${filter}%`), cursor ? gt(category.name, cursor) : undefined),
        )
        .limit(limit)
        .orderBy(category.name)
        .then((data) => data.map(({ name }) => name));
    }),
});
