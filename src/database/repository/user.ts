import { and, eq, type InferModel } from "drizzle-orm";
import { Repository } from ".";
import { db } from "..";
import { account, user } from "../schema/auth";

class UserRepository extends Repository<typeof user> {
  getByAccount(query: Pick<InferModel<typeof account>, "provider" | "providerAccountId">) {
    return db
      .select()
      .from(account)
      .where(
        and(
          eq(account.provider, query.provider),
          eq(account.providerAccountId, query.providerAccountId)
        )
      )
      .leftJoin(user, eq(account.userId, user.id))
      .limit(1)
      .then((res) => res[0]?.user);
  }
}

const userRepository = new UserRepository(user);
export default userRepository;
