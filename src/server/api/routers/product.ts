import productRepository from "@/database/repository/product";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import getScrapedProducts from "@/server/utils/scrapers";
import { z } from "zod";

export const productRouter = createTRPCRouter({
  getProducts: protectedProcedure.input(z.string()).query(async ({ input }): Promise<string[]> => {
    const dbProducts = await productRepository.findMany((table, { eq }) =>
      eq(table.barcode, input)
    );
    if (dbProducts.length) return dbProducts.map((x) => x.name);

    const scrapedProducts = await getScrapedProducts(input);
    if (scrapedProducts.length) {
      productRepository
        .create(scrapedProducts.map((name) => ({ name, barcode: input })))
        .catch(console.error);
    }

    return scrapedProducts;
  }),
});
