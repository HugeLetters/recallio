import { db } from "@/database";
import { findFirst } from "@/database/query/utils";
import { account, session, user, verificationToken } from "@/database/schema/auth";
import { isValidUrlString } from "@/utils";
import type { Adapter } from "@auth/core/adapters";
import { and, eq, lt, or, type InferSelectModel } from "drizzle-orm";
import { adjectives, animals, uniqueNamesGenerator, type Config } from "unique-names-generator";
import { getFileUrl } from "../uploadthing";
const generatorConfig: Config = { dictionaries: [adjectives, animals], separator: "_", length: 2 };

export function DatabaseAdapter(): Adapter {
  return {
    async createUser(data) {
      const id = crypto.randomUUID();
      await db.insert(user).values(
        Object.assign(data, {
          id,
          name: data.name ?? uniqueNamesGenerator(generatorConfig),
        }),
      );

      return findFirst(user, eq(user.id, id)).then(([user]) => {
        if (!user) throw new Error("User was not created successfully");
        return userWithImageUrl(user);
      });
    },
    getUser(id) {
      return findFirst(user, eq(user.id, id)).then(([user]) => {
        if (!user) return null;
        return userWithImageUrl(user);
      });
    },
    getUserByEmail(email) {
      return findFirst(user, eq(user.email, email)).then(([user]) => {
        if (!user) return null;
        return userWithImageUrl(user);
      });
    },
    async createSession(data) {
      await db.insert(session).values(data);

      return findFirst(session, eq(session.sessionToken, data.sessionToken)).then(([data]) => {
        if (!data) throw new Error("Session was not created successfully");
        return data;
      });
    },
    getSessionAndUser(sessionToken) {
      return findFirst(session, eq(session.sessionToken, sessionToken))
        .innerJoin(user, eq(user.id, session.userId))
        .then(([data]) => {
          if (!data) return null;
          return { session: data.session, user: userWithImageUrl(data.user) };
        });
    },
    async updateUser(data) {
      if (!data.id) {
        throw new Error("No user id.");
      }

      await db
        .update(user)
        .set(Object.assign(data, { name: data.name ?? undefined }))
        .where(eq(user.id, data.id));

      return findFirst(user, eq(user.id, data.id)).then(([user]) => {
        if (!user) throw new Error("User was not updated successfully");
        return userWithImageUrl(user);
      });
    },
    async updateSession(data) {
      await db.update(session).set(data).where(eq(session.sessionToken, data.sessionToken));

      return findFirst(session, eq(session.sessionToken, data.sessionToken)).then(([data]) => data);
    },
    async linkAccount(data) {
      await db.insert(account).values(data);
    },
    getUserByAccount({ provider, providerAccountId }) {
      return findFirst(
        account,
        and(eq(account.provider, provider), eq(account.providerAccountId, providerAccountId)),
      )
        .innerJoin(user, eq(user.id, account.userId))
        .then(([data]) => {
          if (!data) return null;
          return userWithImageUrl(data.user);
        });
    },
    async deleteSession(sessionToken) {
      const [sessionToDelete] = await findFirst(session, eq(session.sessionToken, sessionToken));

      if (sessionToDelete) {
        await db
          .delete(session)
          .where(or(eq(session.sessionToken, sessionToken), lt(session.expires, new Date())));
      }

      return sessionToDelete;
    },
    async createVerificationToken(token) {
      await db.insert(verificationToken).values(token);

      return findFirst(
        verificationToken,
        and(
          eq(verificationToken.identifier, token.identifier),
          eq(verificationToken.token, token.token),
        ),
      ).then(([data]) => data);
    },
    async useVerificationToken(token) {
      const [tokenToDelete] = await findFirst(
        verificationToken,
        and(
          eq(verificationToken.identifier, token.identifier),
          eq(verificationToken.token, token.token),
        ),
      );

      if (tokenToDelete) {
        await db
          .delete(verificationToken)
          .where(
            or(
              and(
                eq(verificationToken.identifier, token.identifier),
                eq(verificationToken.token, token.token),
              ),
              lt(verificationToken.expires, new Date()),
            ),
          );
      }

      return tokenToDelete ?? null;
    },
    async deleteUser(id) {
      const [userToDelete] = await findFirst(user, eq(user.id, id));

      if (userToDelete) {
        await db.delete(user).where(eq(user.id, id));
      }

      return userToDelete ?? null;
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await db
        .delete(account)
        .where(
          and(eq(account.providerAccountId, providerAccountId), eq(account.provider, provider)),
        );
      return undefined;
    },
  };
}

type User = InferSelectModel<typeof user>;
function userWithImageUrl(user: User): User {
  if (!user.image || isValidUrlString(user.image)) return user;
  return { ...user, image: getFileUrl(user.image) };
}
