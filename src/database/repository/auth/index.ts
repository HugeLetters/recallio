import { account, session, user, verificationToken } from "@/database/schema/auth";
import { Repository, type WhereQuery } from "..";

type Account = typeof account;
class AccountRepository extends Repository<Account> {
  findFirstWithUser(query: WhereQuery<Account>) {
    return this.db
      .select()
      .from(account)
      .where(query(this.table, this.operators))
      .innerJoin(user, this.operators.eq(user.id, account.userId))
      .limit(1)
      .then((res) => res[0]);
  }
}
export const accountRepository = new AccountRepository(account);

type Session = typeof session;
class SessionRepository extends Repository<Session> {
  findFirstWithUser(query: WhereQuery<Session>) {
    return this.db
      .select()
      .from(session)
      .where(query(this.table, this.operators))
      .innerJoin(user, this.operators.eq(user.id, session.userId))
      .limit(1)
      .then((res) => res[0]);
  }
}
export const sessionRepository = new SessionRepository(session);

type User = typeof user;
class UserRepository extends Repository<User> {}
export const userRepository = new UserRepository(user);

type VerificationToken = typeof verificationToken;
class VerificationTokenRepository extends Repository<VerificationToken> {}
export const verificationTokenRepository = new VerificationTokenRepository(verificationToken);
