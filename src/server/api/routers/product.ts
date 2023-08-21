import { db } from "@/database";
import { product } from "@/database/schema/product";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import getScrapedProducts from "@/server/utils/scrapers";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const productRouter = createTRPCRouter({
  getProducts: protectedProcedure.input(z.string()).query(async ({ input }): Promise<string[]> => {
    const dbProducts = await db.select().from(product).where(eq(product.barcode, input));
    if (dbProducts.length) return dbProducts.map((x) => x.name);

    const scrapedProducts = await getScrapedProducts(input);
    if (scrapedProducts.length) {
      db.insert(product)
        .values(scrapedProducts.map((name) => ({ name, barcode: input })))
        .catch(console.error);
    }

    return scrapedProducts;
  }),
});
