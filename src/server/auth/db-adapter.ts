import accountRepository from "@/database/repository/account";
import sessionRepository from "@/database/repository/session";
import userRepository from "@/database/repository/user";
import verificationTokenRepository from "@/database/repository/verificationToken";
import type { Adapter } from "@auth/core/adapters";

export function DatabaseAdapter(): Adapter {
  return {
    async createUser(data) {
      const id = crypto.randomUUID();
      const user = Object.assign(data, { id, name: data.name ?? data.email });
      await userRepository.create(user);

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
    async createSession(session) {
      await sessionRepository.create(session);

      return sessionRepository
        .findFirst((table, { eq }) => eq(table.sessionToken, session.sessionToken))
        .then((res) => {
          if (!res) throw new Error("Session was not created successfully");
          return res;
        });
    },
    getSessionAndUser(sessionToken) {
      return sessionRepository
        .findFirstWithUser((table, { eq }) => eq(table.sessionToken, sessionToken))
        .then((x) => x ?? null);
    },
    async updateUser(data) {
      if (!data.id) {
        throw new Error("No user id.");
      }
      const user = Object.assign(data, { name: data.name ?? undefined });
      await userRepository.update(user, (table, { eq }) => eq(table.id, data.id));

      return userRepository
        .findFirst((table, { eq }) => eq(table.id, data.id))
        .then((value) => {
          if (!value) throw new Error("User was not updated successfully");
          return value;
        });
    },
    async updateSession(session) {
      await sessionRepository.update(session, (table, { eq }) =>
        eq(table.sessionToken, session.sessionToken)
      );

      return sessionRepository.findFirst((table, { eq }) =>
        eq(table.sessionToken, session.sessionToken)
      );
    },
    async linkAccount(account) {
      await accountRepository.create(account);
    },
    getUserByAccount(account) {
      return accountRepository
        .findFirstWithUser((table, { and, eq }) =>
          and(
            eq(table.provider, account.provider),
            eq(table.providerAccountId, account.providerAccountId)
          )
        )
        .then((x) => x?.user ?? null);
    },
    async deleteSession(sessionToken) {
      const session = await sessionRepository.findFirst((table, { eq }) =>
        eq(table.sessionToken, sessionToken)
      );

      if (session) {
        await sessionRepository.delete((table, { eq }) => eq(table.sessionToken, sessionToken));
      }

      return session;
    },
    async createVerificationToken(token) {
      await verificationTokenRepository.create(token);

      return verificationTokenRepository.findFirst((table, { eq }) =>
        eq(table.identifier, token.identifier)
      );
    },
    async useVerificationToken(token) {
      const deletedToken = await verificationTokenRepository.findFirst((table, { and, eq }) =>
        and(eq(table.identifier, token.identifier), eq(table.token, token.token))
      );

      if (deletedToken) {
        await verificationTokenRepository.delete((table, { and, eq }) =>
          and(eq(table.identifier, token.identifier), eq(table.token, token.token))
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
    async unlinkAccount(account) {
      await accountRepository.delete((table, { and, eq }) =>
        and(
          eq(table.providerAccountId, account.providerAccountId),
          eq(table.provider, account.provider)
        )
      );

      return undefined;
    },
  };
}
