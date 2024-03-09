import { db } from "@/server/database";
import { findFirst } from "@/server/database/query/utils";
import { account, session, user, verificationToken } from "@/server/database/schema/auth";
import { and, eq, lt, or } from "drizzle-orm";
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  VerificationToken,
} from "next-auth/adapters";
import type { Config } from "unique-names-generator";
import { adjectives, animals, uniqueNamesGenerator } from "unique-names-generator";
import { getFileUrl } from "../uploadthing";
const generatorConfig: Config = { dictionaries: [adjectives, animals], separator: "_", length: 2 };

export function DatabaseAdapter(): Adapter {
  return {
    createUser: function (data) {
      return db
        .insert(user)
        .values({
          ...data,
          id: crypto.randomUUID(),
          name: data.name ?? uniqueNamesGenerator(generatorConfig),
        })
        .returning()
        .get()
        .then(userWithImageUrl);
    },
    getUser: function (id) {
      return findFirst(user, eq(user.id, id)).then((user) => {
        if (!user) return null;
        return userWithImageUrl(user);
      });
    },
    getUserByEmail: function (email) {
      return findFirst(user, eq(user.email, email)).then((user) => {
        if (!user) return null;
        return userWithImageUrl(user);
      });
    },
    createSession: function (data) {
      return db.insert(session).values(data).returning().get();
    },
    getSessionAndUser: function (sessionToken) {
      return db
        .select()
        .from(session)
        .where(eq(session.sessionToken, sessionToken))
        .innerJoin(user, eq(user.id, session.userId))
        .get()
        .then((data) => {
          if (!data) return null;
          return { session: data.session, user: userWithImageUrl(data.user) };
        });
    },
    updateUser: function (data) {
      return db
        .update(user)
        .set({ ...data, name: data.name ?? undefined })
        .where(eq(user.id, data.id))
        .returning()
        .get()
        .then(userWithImageUrl);
    },
    updateSession: function (data) {
      return db
        .update(session)
        .set(data)
        .where(eq(session.sessionToken, data.sessionToken))
        .returning()
        .get();
    },
    linkAccount: function (data): Promise<AdapterAccount> {
      return db.insert(account).values(data).returning().get().then(undefineObject);
    },
    getUserByAccount: function ({ provider, providerAccountId }) {
      return db
        .select({ user })
        .from(account)
        .where(
          and(eq(account.provider, provider), eq(account.providerAccountId, providerAccountId)),
        )
        .innerJoin(user, eq(user.id, account.userId))
        .get()
        .then((data) => {
          if (!data) return null;
          return userWithImageUrl(data.user);
        });
    },
    deleteSession: function (token): Promise<AdapterSession | undefined> {
      return db
        .delete(session)
        .where(or(eq(session.sessionToken, token), lt(session.expires, new Date())))
        .returning()
        .all()
        .then((sessions) => sessions.find(({ sessionToken }) => sessionToken === token));
    },
    createVerificationToken: function (token) {
      return db.insert(verificationToken).values(token).returning().get();
    },
    useVerificationToken: function (data): Promise<VerificationToken | null> {
      return db
        .delete(verificationToken)
        .where(
          or(
            and(
              eq(verificationToken.identifier, data.identifier),
              eq(verificationToken.token, data.token),
            ),
            lt(verificationToken.expires, new Date()),
          ),
        )
        .returning()
        .all()
        .then(
          (tokens) =>
            tokens.find(
              (token) => token.identifier === data.identifier && token.token === data.token,
            ) ?? null,
        );
    },
    deleteUser: function (id) {
      return db.delete(user).where(eq(user.id, id)).returning().get();
    },
    unlinkAccount: function ({ provider, providerAccountId }): Promise<AdapterAccount | undefined> {
      return db
        .delete(account)
        .where(
          and(eq(account.providerAccountId, providerAccountId), eq(account.provider, provider)),
        )
        .returning()
        .get()
        .then(undefineObject);
    },
  };
}

type User = typeof user.$inferSelect;
function userWithImageUrl(user: User): User {
  if (!user.image || URL.canParse(user.image)) return user;
  return { ...user, image: getFileUrl(user.image) };
}

type CoalesceNull<T> = T extends null ? undefined : T;
/** Given an object will turn all `null` properties values to `undefined`. **Mutates the object** */
function undefineObject<T>(target: T) {
  for (const key in target) {
    // @ts-expect-error we're purposefully mutating an object
    target[key] ??= undefined;
  }
  return target as { [K in keyof T]: CoalesceNull<T[K]> };
}
