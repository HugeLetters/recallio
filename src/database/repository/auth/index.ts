import { eq } from "drizzle-orm";
import { Repository, type WhereQuery } from "..";
import { account, session, user, verificationToken } from "@/database/schema/auth";

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
export const accountRepository = new AccountRepository(account);

class SessionRepository<T extends typeof session> extends Repository<T> {
  findFirstWithUser(query: WhereQuery<T>) {
    return this.db
      .select()
      .from(session)
      .where(query(this.table, this.operators))
      .innerJoin(user, eq(user.id, session.userId))
      .limit(1)
      .then((res) => res[0]);
  }
}
export const sessionRepository = new SessionRepository(session);

class UserRepository<T extends typeof user> extends Repository<T> {}
export const userRepository = new UserRepository(user);

class VerificationTokenRepository<T extends typeof verificationToken> extends Repository<T> {}
export const verificationTokenRepository = new VerificationTokenRepository(verificationToken);
