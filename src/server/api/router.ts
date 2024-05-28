import { logsRouter } from "./logs";
import { productRouter } from "./product";
import { createTRPCRouter } from "./trpc";
import { userRouter } from "./user";

export const apiRouter = createTRPCRouter({
  product: productRouter,
  user: userRouter,
  logs: logsRouter,
});

export type ApiRouter = typeof apiRouter;
