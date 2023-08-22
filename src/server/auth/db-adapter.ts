import { db } from "@/database";
import { account, session, user, verificationToken } from "@/database/schema/auth";
import type { Adapter } from "@auth/core/adapters";
import { and, eq } from "drizzle-orm";

export function DatabaseAdapter(): Adapter {
  return {
    async createUser(data) {
      const id = crypto.randomUUID();
      const newUser = Object.assign(data, { id, name: data.name ?? data.email });
      await db.insert(user).values(newUser);

      return db
        .select()
        .from(user)
        .where(eq(user.id, id))
        .limit(1)
        .then((res) => {
          if (!res[0]) throw new Error("User was not created successfully");
          return res[0];
        });
    },
    getUser(id) {
      return db
        .select()
        .from(user)
        .where(eq(user.id, id))
        .limit(1)
        .then((res) => res[0] ?? null);
    },
    getUserByEmail(email) {
      return db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1)
        .then((res) => res[0] ?? null);
    },
    async createSession(data) {
      await db.insert(session).values(data);

      return await db
        .select()
        .from(session)
        .where(eq(session.sessionToken, data.sessionToken))
        .limit(1)
        .then((res) => {
          if (!res[0]) throw new Error("Session was not created successfully");
          return res[0];
        });
    },
    getSessionAndUser(sessionToken) {
      return db
        .select({ session, user })
        .from(session)
        .where(eq(session.sessionToken, sessionToken))
        .innerJoin(user, eq(user.id, session.userId))
        .limit(1)
        .then((res) => res[0] ?? null);
    },
    async updateUser(data) {
      if (!data.id) {
        throw new Error("No user id.");
      }
      const nData = Object.assign(data, { name: data.name ?? undefined });
      await db.update(user).set(nData).where(eq(user.id, data.id));

      return db
        .select()
        .from(user)
        .where(eq(user.id, data.id))
        .limit(1)
        .then((res) => {
          if (!res[0]) throw new Error("User was not updated successfully");
          return res[0];
        });
    },
    async updateSession(data) {
      await db.update(session).set(data).where(eq(session.sessionToken, data.sessionToken));

      return db
        .select()
        .from(session)
        .where(eq(session.sessionToken, data.sessionToken))
        .limit(1)
        .then((res) => res[0]);
    },
    async linkAccount(rawAccount) {
      // values as an array because of a Drizzle bug where excess peroperties cause a crash on single insert
      await db.insert(account).values([rawAccount]);
    },
    getUserByAccount(data) {
      return db
        .select()
        .from(account)
        .where(
          and(
            eq(account.providerAccountId, data.providerAccountId),
            eq(account.provider, data.provider)
          )
        )
        .leftJoin(user, eq(account.userId, user.id))
        .limit(1)
        .then((res) => res[0]?.user ?? null);
    },
    async deleteSession(sessionToken) {
      const sessionRow = await db
        .select()
        .from(session)
        .where(eq(session.sessionToken, sessionToken))
        .limit(1)
        .then((res) => res[0]);

      if (sessionRow) {
        await db.delete(session).where(eq(session.sessionToken, sessionToken));
      }

      return sessionRow;
    },
    async createVerificationToken(token) {
      await db.insert(verificationToken).values(token);

      return db
        .select()
        .from(verificationToken)
        .where(eq(verificationToken.identifier, token.identifier))
        .limit(1)
        .then((res) => res[0]);
    },
    async useVerificationToken(token) {
      const deletedToken = await db
        .select()
        .from(verificationToken)
        .where(
          and(
            eq(verificationToken.identifier, token.identifier),
            eq(verificationToken.token, token.token)
          )
        )
        .limit(1)
        .then((res) => res[0]);

      if (deletedToken) {
        await db
          .delete(verificationToken)
          .where(
            and(
              eq(verificationToken.identifier, token.identifier),
              eq(verificationToken.token, token.token)
            )
          );
      }

      return deletedToken ?? null;
    },
    async deleteUser(id) {
      const dbUser = await db
        .select()
        .from(user)
        .where(eq(user.id, id))
        .limit(1)
        .then((res) => res[0]);

      if (dbUser) {
        await db.delete(user).where(eq(user.id, id));
      }

      return dbUser ?? null;
    },
    async unlinkAccount(accountData) {
      await db
        .delete(account)
        .where(
          and(
            eq(account.providerAccountId, accountData.providerAccountId),
            eq(account.provider, accountData.provider)
          )
        );

      return undefined;
    },
  };
}
