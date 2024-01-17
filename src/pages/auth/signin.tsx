import { Button, Input, WithLabel, providers } from "@/components/UI";
import { getQueryParam } from "@/utils";
import type { NextPageWithLayout } from "@/utils/type";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Logo from "~icons/custom/logo";
import AlertIcon from "~icons/jam/alert-f";

const Page: NextPageWithLayout = function () {
  const { query } = useRouter();
  const callbackUrl = getQueryParam(query.callbackUrl);
  const error = getErrorMessage(getQueryParam(query.error));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col p-4">
      {!!error && (
        <div className="flex w-fit items-center gap-2 self-center rounded-lg bg-red-800/10 px-2.5 py-4 text-red-800/80">
          <AlertIcon className="h-8 w-8 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      <div className="flex grow flex-col items-center justify-center">
        <Logo className="shrink-0" />
        <p className="mb-6 text-xl">Unlock a world of informed shopping</p>
        <EmailSignIn callbackUrl={callbackUrl} />
        <div className="relative z-0 my-6 flex w-full justify-center">
          <hr className="absolute top-1/2 -z-10 w-full" />
          <span className="bg-white px-4 text-neutral-400">Or</span>
        </div>
        <ProviderSignIn callbackUrl={callbackUrl} />
      </div>
    </div>
  );
};

// todo redirect if signed in
Page.noAuth = true;

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
        void signIn("email", { email, callbackUrl, redirect: false });

        void router.push({ pathname: "/auth/email", query: { callbackUrl, email } });
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
        className="font-semibold group-valid:primary group-invalid:disabled group-invalid:ghost group-invalid:text-neutral-400"
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
      {providers.map(([provider, Icon]) => (
        <Button
          className="ghost"
          key={provider}
          aria-label={`sign in with ${provider}`}
          onClick={() => {
            void signIn(provider, { callbackUrl });
          }}
        >
          <Icon className="mx-auto h-7 w-7" />
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
