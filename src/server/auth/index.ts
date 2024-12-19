import { env } from "@/server/env/index.mjs";
import type { GetServerSidePropsContext } from "next";
import type { DefaultSession, NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import EmailProvider from "next-auth/providers/email";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { createTransport } from "nodemailer";
import type { user } from "../database/schema/user";
import { getEmailHtml, getEmailText } from "./PinEmail";
import { DatabaseAdapter } from "./db-adapter";
import { TOKEN_DURATION_MIN } from "./token";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
type DbUser = typeof user.$inferSelect;
declare module "next-auth" {
  interface User extends DbUser {
    name: string;
  }
  interface Session extends DefaultSession {
    user: User;
  }
}

export const AuthOptions = {
  pages: {
    signIn: "/auth/signin",
    signOut: "/profile/settings",
    verifyRequest: "/auth/email",
    error: "/auth/error",
  },
  adapter: DatabaseAdapter(),
  callbacks: {
    session: ({ session, user }) => {
      return Object.assign<Session, Pick<Session, "user">>(session, { user });
    },
  },
  //! When adding a new provider don't forget to add a new host to allowed patterns for external images
  providers: [
    EmailProvider({
      type: "email",
      server: {
        service: "gmail",
        auth: {
          user: env.NODEMAILER_EMAIL,
          pass: env.NODEMAILER_PASSWORD,
        },
      },
      from: env.NODEMAILER_EMAIL,
      generateVerificationToken() {
        return crypto.randomUUID().slice(0, 6).toUpperCase();
      },
      maxAge: TOKEN_DURATION_MIN * 60,
      async sendVerificationRequest({ provider, identifier, token, url }) {
        // do not remove this await or you WILL be executed
        // this prevents vercel from finishing handling the request before an email is sent
        await createTransport(provider.server)
          .sendMail({
            to: identifier,
            from: { address: provider.from, name: "Recallio" },
            subject: "Sign in to Recallio app",
            html: getEmailHtml({ token, url }),
            text: getEmailText({ token, url }),
          })
          .then((res) => {
            const failed = res.rejected.concat(res.pending).filter(Boolean);
            if (failed.length) {
              throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
            }
          })
          .catch(console.error);
      },
    }),
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    }),
    GithubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    LinkedInProvider({
      clientId: env.LINKED_IN_CLIENT_ID,
      clientSecret: env.LINKED_IN_CLIENT_SECRET,
    }),
  ],
} satisfies NextAuthOptions;

export function getServerAuthSession(ctx: Pick<GetServerSidePropsContext, "req" | "res">) {
  return getServerSession(ctx.req, ctx.res, AuthOptions);
}
