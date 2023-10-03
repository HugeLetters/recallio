import { categoryRepository, productNameRepository } from "@/database/repository/product";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import getScrapedProducts from "@/server/utils/scrapers";
import { nonEmptyArray } from "@/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const productRouter = createTRPCRouter({
  getProductNames: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .query(async ({ input: { barcode } }): Promise<string[]> => {
      const dbProducts = await productNameRepository.findMany((table, { eq }) =>
        eq(table.barcode, barcode)
      );
      if (dbProducts.length) return dbProducts.map((x) => x.name);

      const scrapedProducts = await getScrapedProducts(barcode);

      const savedProducts = scrapedProducts.map((name) => ({ name, barcode }));
      if (nonEmptyArray(savedProducts)) {
        productNameRepository
          .create(savedProducts)
          .onDuplicateKeyUpdate({ set: { barcode: sql`${productNameRepository.table.barcode}` } })
          .catch(console.error);
      }

      return scrapedProducts;
    }),
  getCategories: protectedProcedure.input(z.string()).query(({ input }) => {
    return categoryRepository
      .findMany((table, { like }) => like(table.name, `${input}%`))
      .limit(10)
      .then((data) => data.map((x) => x.name));
  }),
});
