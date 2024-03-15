import { productRouter } from "./product";
import { createTRPCRouter } from "./trpc";
import { userRouter } from "./user";

export const apiRouter = createTRPCRouter({
  product: productRouter,
  user: userRouter,
});

export type ApiRouter = typeof apiRouter;
