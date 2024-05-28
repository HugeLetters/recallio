import { providerIcons } from "@/auth/provider/icon";
import { Button } from "@/interface/button";
import { Input, WithLabel } from "@/interface/input";
import type { NextPageWithLayout } from "@/layout";
import { logger } from "@/logger";
import { getQueryParam } from "@/navigation/query";
import { Redirect, useRedirectQuery } from "@/navigation/redirect";
import { signIn, useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import Logo from "~icons/custom/logo";
import AlertIcon from "~icons/jam/alert-f";

const Page: NextPageWithLayout = function () {
  const router = useRouter();
  const { status } = useSession();
  const callbackUrl = useRedirectQuery("callbackUrl", "/profile");
  const error = getErrorMessage(getQueryParam(router.query.error));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col p-4">
      <Head>
        <title>sign-in</title>
      </Head>
      {status === "authenticated" && <Redirect to={callbackUrl} />}
      {!!error && (
        <div className="flex w-fit items-center gap-2 self-center rounded-lg bg-red-800/10 px-2.5 py-4 text-red-800/80">
          <AlertIcon className="size-8 shrink-0" />
          <span className="whitespace-pre-wrap text-sm">{error}</span>
        </div>
      )}
      <div className="flex grow flex-col items-center justify-center">
        <Logo className="h-24 w-52 shrink-0" />
        <p className="mb-6 text-xl">Unlock a world of informed shopping</p>
        <EmailSignIn callbackUrl={callbackUrl} />
        <div className="relative z-0 my-6 flex w-full justify-center">
          <hr className="absolute top-1/2 -z-10 w-full" />
          <span className="bg-white px-4 text-neutral-500">Or</span>
        </div>
        <ProviderSignIn callbackUrl={callbackUrl} />
      </div>
    </div>
  );
};
Page.isPublic = true;

export default Page;

type EmailSignInProps = { callbackUrl: string | undefined };
function EmailSignIn({ callbackUrl }: EmailSignInProps) {
  const router = useRouter();

  return (
    <form
      className="group grid w-full gap-2"
      onSubmit={(e) => {
        const email = new FormData(e.currentTarget).get("email");
        if (typeof email !== "string") return;

        e.preventDefault();
        signIn("email", { email, callbackUrl, redirect: false }).catch(logger.error);

        router.push({ pathname: "/auth/email", query: { callbackUrl, email } }).catch(logger.error);
      }}
    >
      <WithLabel label="E-mail">
        <Input
          required
          name="email"
          type="email"
        />
      </WithLabel>
      <Button
        type="submit"
        className="font-semibold group-valid:primary group-invalid:disabled group-invalid:ghost group-invalid:text-neutral-500"
      >
        Continue
      </Button>
    </form>
  );
}

type ProviderSignInProps = { callbackUrl: string | undefined };
function ProviderSignIn({ callbackUrl }: ProviderSignInProps) {
  return (
    <div className="grid w-full grid-cols-4 gap-3">
      {providerIcons.map(([provider, Icon]) => (
        <Button
          className="ghost"
          key={provider}
          aria-label={`sign in with ${provider}`}
          onClick={() => {
            signIn(provider, { callbackUrl }).catch(logger.error);
          }}
        >
          <Icon className="mx-auto size-7" />
        </Button>
      ))}
    </div>
  );
}

type ErrorCode =
  | "OAuthSignin"
  | "OAuthCallback"
  | "OAuthCreateAccount"
  | "EmailCreateAccount"
  | "Callback"
  | "OAuthAccountNotLinked"
  | "EmailSignin"
  | "CredentialsSignin"
  | "SessionRequired"
  | "Default";

function getErrorMessage(
  errorCode: ErrorCode | (string & NonNullable<unknown>) | undefined,
): string | null {
  if (!errorCode) return null;
  switch (errorCode) {
    case "OAuthCallback":
      return "Unrecognized response from provider";
    case "OAuthCreateAccount":
    case "EmailCreateAccount":
      return "There was an error trying to create a user";
    case "OAuthAccountNotLinked":
      return "You're trying to sign in using an unlinked account\nYou may link an account in profile settings";
    case "EmailSignin":
      return "There was an error trying to send an email";
    case "CredentialsSignin":
      return "Invalid credentials";
    case "SessionRequired":
      return null;
    // return "Please sign in to access this page";
    case "OAuthSignin":
    case "Callback":
    case "Default":
    default:
      return "Unrecognized error";
  }
}
