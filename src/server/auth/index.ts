import { env } from "@/env.mjs";
import { type GetServerSidePropsContext } from "next";
import { getServerSession, type DefaultSession, type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import EmailProvider from "next-auth/providers/email";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { createTransport } from "nodemailer";
import { getEmailHtml, getEmailText } from "./PinEmail";
import { DatabaseAdapter } from "./db-adapter";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      name: string;
      // ...other properties
      // role: UserRole;
    };
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/auth/signin",
    signOut: "/profile/settings",
    verifyRequest: "/auth/email",
    error: "/auth/error",
  },
  adapter: DatabaseAdapter(),
  callbacks: {
    session: ({ session, user }) => {
      return Object.assign(session, { user });
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
      maxAge: 5 * 60, // 5 minutes
      generateVerificationToken() {
        return crypto.randomUUID().slice(0, 6).toUpperCase();
      },
      sendVerificationRequest({ provider, identifier, token, url }) {
        // todo - email styling & theme etc
        createTransport(provider.server)
          .sendMail({
            to: identifier,
            from: provider.from,
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
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
