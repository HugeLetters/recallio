import { eq } from "drizzle-orm";
import { Repository, type WhereQuery } from ".";
import { session, user } from "../schema/auth";

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

const sessionRepository = new SessionRepository(session);
export default sessionRepository;
