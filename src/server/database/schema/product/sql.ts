import { sql } from "drizzle-orm";
import { productMeta } from ".";

export const averageProductRating = sql<number>`CAST(${productMeta.publicTotalRating} AS FLOAT) / ${productMeta.publicReviewCount}`;
