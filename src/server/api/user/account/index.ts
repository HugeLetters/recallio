import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database/client";
import { account } from "@/server/database/schema/user";
import { eq } from "drizzle-orm";
import { deleteAccount } from "./delete-account";

export const accountRouter = createTRPCRouter({
  deleteAccount,
  getProviders: protectedProcedure.query(({ ctx: { session } }) => {
    return db
      .select({ provider: account.provider })
      .from(account)
      .where(eq(account.userId, session.user.id))
      .then((accounts) => accounts.map((account) => account.provider));
  }),
});
