import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database";
import { query } from "@/server/database/query/aggregate";
import { category, review, reviewsToCategories } from "@/server/database/schema/product";
import { getFileUrl } from "@/server/uploadthing";
import { mostCommon } from "@/utils/array";
import { and, eq, exists, gt, like } from "drizzle-orm";
import { z } from "zod";
import { cacheProductNames, getProductNames } from "../../product/cache";
import { createBarcodeSchema } from "../../product/schema";
import getScrapedProducts from "../../product/scrapers";
import { throwDefaultError } from "../utils/error";
import { getReviewList } from "./review-list";
import { getSummaryList } from "./summary-list";

const getSummary = protectedProcedure
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
      .as("category-subquery");

    return db
      .select({
        name: query.aggregate(review.name, (x) => mostCommon(1)(x)[0]!),
        rating: query.avg(review.rating),
        reviewCount: query.count(),
        image: query.map(query.min(review.imageKey), getFileUrl),
        categories: categorySq.categories,
      })
      .from(review)
      .where(and(eq(review.barcode, barcode), eq(review.isPrivate, false)))
      .leftJoin(categorySq, eq(review.barcode, categorySq.barcode))
      .groupBy(review.barcode)
      .limit(1)
      .then(([x]) => x ?? null)
      .catch(throwDefaultError);
  });

export const productRouter = createTRPCRouter({
  getSummaryList,
  getReviewList,
  getSummary,
  getNames: protectedProcedure
    .input(z.object({ barcode: createBarcodeSchema(undefined) }))
    .query(({ input: { barcode } }): Promise<string[]> => {
      return getProductNames(barcode)
        .then((cached) => {
          if (cached) return cached;

          return getScrapedProducts(barcode).then((products) => {
            cacheProductNames(barcode, products).catch(console.error);
            return products;
          });
        })
        .catch(throwDefaultError);
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
        .select()
        .from(category)
        .where(
          and(like(category.name, `${filter}%`), cursor ? gt(category.name, cursor) : undefined),
        )
        .limit(limit)
        .orderBy(category.name)
        .then((data) => data.map((x) => x.name))
        .catch(throwDefaultError);
    }),
});