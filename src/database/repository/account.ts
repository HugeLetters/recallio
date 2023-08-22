import { eq } from "drizzle-orm";
import { Repository, type WhereQuery } from ".";
import { account, user } from "../schema/auth";

class AccountRepository<T extends typeof account> extends Repository<T> {
  findFirstWithUser(query: WhereQuery<T>) {
    return this.db
      .select()
      .from(account)
      .where(query(this.table, this.operators))
      .innerJoin(user, eq(user.id, account.userId))
      .limit(1)
      .then((res) => res[0]);
  }
}

const accountRepository = new AccountRepository(account);
export default accountRepository;
