import { productCategoryRepository, productNameRepository } from "@/database/repository/product";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import getScrapedProducts from "@/server/utils/scrapers";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const productRouter = createTRPCRouter({
  getProductNames: protectedProcedure
    .input(z.string())
    .query(async ({ input }): Promise<string[]> => {
      const dbProducts = await productNameRepository.findMany((table, { eq }) =>
        eq(table.barcode, input)
      );
      if (dbProducts.length) return dbProducts.map((x) => x.name);

      const scrapedProducts = await getScrapedProducts(input);
      if (scrapedProducts.length) {
        productNameRepository
          .create(scrapedProducts.map((name) => ({ name, barcode: input })))
          .onDuplicateKeyUpdate({ set: { barcode: sql`${productNameRepository.table.barcode}` } })
          .catch(console.error);
      }

      return scrapedProducts;
    }),
  getProudctCategories: protectedProcedure.input(z.string()).query(({ input }) => {
    return productCategoryRepository
      .findMany((table, { like }) => like(table.name, `%${input}%`))
      .limit(10);
  }),
});
