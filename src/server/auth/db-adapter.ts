import { db } from "@/server/database/client/serverless";
import { account, session, user, verificationToken } from "@/server/database/schema/user";
import { getFileUrl } from "@/server/uploadthing";
import { and, eq, lt, or } from "drizzle-orm";
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import type { Config } from "unique-names-generator";
import { adjectives, animals, uniqueNamesGenerator } from "unique-names-generator";

const generatorConfig: Config = { dictionaries: [adjectives, animals], separator: "_", length: 2 };
const userColumns = {
  id: user.id,
  name: user.name,
  image: user.image,
  email: user.email,
  emailVerified: user.emailVerified,
};
export function DatabaseAdapter(): Adapter {
  return {
    createUser(data) {
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
    getUser(id) {
      return db
        .select(userColumns)
        .from(user)
        .where(eq(user.id, id))
        .limit(1)
        .get()
        .then((user) => {
          if (!user) return null;
          return userWithImageUrl(user);
        });
    },
    getUserByEmail(email) {
      return db
        .select(userColumns)
        .from(user)
        .where(eq(user.email, email))
        .limit(1)
        .get()
        .then((user) => {
          if (!user) return null;
          return userWithImageUrl(user);
        });
    },
    createSession(data) {
      return db.insert(session).values(data).returning().get();
    },
    getSessionAndUser(sessionToken) {
      return db
        .select({
          session,
          user: userColumns,
        })
        .from(session)
        .where(eq(session.sessionToken, sessionToken))
        .innerJoin(user, eq(user.id, session.userId))
        .get()
        .then((data) => {
          if (!data) return null;
          return { session: data.session, user: userWithImageUrl(data.user) };
        });
    },
    updateUser(data) {
      return db
        .update(user)
        .set({ ...data, name: data.name ?? undefined })
        .where(eq(user.id, data.id))
        .returning()
        .get()
        .then(userWithImageUrl);
    },
    updateSession(data) {
      return db
        .update(session)
        .set(data)
        .where(eq(session.sessionToken, data.sessionToken))
        .returning()
        .get();
    },
    linkAccount(data): Promise<AdapterAccount> {
      return db.insert(account).values(data).returning().get().then(undefineObject);
    },
    getUserByAccount({ provider, providerAccountId }) {
      return db
        .select({ user: userColumns })
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
    deleteSession(token): Promise<AdapterSession | undefined> {
      return db
        .delete(session)
        .where(or(eq(session.sessionToken, token), lt(session.expires, new Date())))
        .returning()
        .all()
        .then((sessions) => sessions.find(({ sessionToken }) => sessionToken === token));
    },
    createVerificationToken(token) {
      return db.insert(verificationToken).values(token).returning().get();
    },
    useVerificationToken(data): Promise<VerificationToken | null> {
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
    deleteUser(id) {
      return db.delete(user).where(eq(user.id, id)).returning().get();
    },
    unlinkAccount({ provider, providerAccountId }): Promise<AdapterAccount | undefined> {
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

function userWithImageUrl(user: AdapterUser): AdapterUser {
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
