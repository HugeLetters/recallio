import { productRouter } from "@/server/api/routers/product";
import { createTRPCRouter } from "@/server/api/trpc";
import { reviewRouter } from "./routers/review";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  product: productRouter,
  review: reviewRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
