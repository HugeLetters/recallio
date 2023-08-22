import { db } from "@/database";
import accountRepository from "@/database/repository/account";
import userRepository from "@/database/repository/user";
import { session, user, verificationToken } from "@/database/schema/auth";
import type { Adapter } from "@auth/core/adapters";
import { and, eq } from "drizzle-orm";

export function DatabaseAdapter(): Adapter {
  return {
    async createUser(data) {
      const id = crypto.randomUUID();
      const newUser = Object.assign(data, { id, name: data.name ?? data.email });
      await userRepository.create(newUser);

      return userRepository
        .findFirst((table, { eq }) => eq(table.id, id))
        .then((value) => {
          if (!value) throw new Error("User was not created successfully");
          return value;
        });
    },
    getUser(id) {
      return userRepository.findFirst((table, { eq }) => eq(table.id, id)).then((x) => x ?? null);
    },
    getUserByEmail(email) {
      return userRepository
        .findFirst((table, { eq }) => eq(table.email, email))
        .then((x) => x ?? null);
    },
    async createSession(data) {
      await db.insert(session).values(data);

      return db
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
      await userRepository.update(nData, (table, { eq }) => eq(table.id, data.id));

      return userRepository
        .findFirst((table, { eq }) => eq(table.id, data.id))
        .then((value) => {
          if (!value) throw new Error("User was not updated successfully");
          return value;
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
      await accountRepository.create(rawAccount);
    },
    getUserByAccount(data) {
      return userRepository.getByAccount(data).then((x) => x ?? null);
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
      const dbUser = await userRepository.findFirst((table, { eq }) => eq(table.id, id));

      if (dbUser) {
        await userRepository.delete((table, { eq }) => eq(table.id, id));
      }

      return dbUser ?? null;
    },
    async unlinkAccount(accountData) {
      await accountRepository.delete((table, { and, eq }) =>
        and(
          eq(table.providerAccountId, accountData.providerAccountId),
          eq(table.provider, accountData.provider)
        )
      );

      return undefined;
    },
  };
}
