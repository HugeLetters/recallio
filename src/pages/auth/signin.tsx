import { Clickable, Input, WithLabel, providers } from "@/components/UI";
import { getQueryParam } from "@/utils";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import Logo from "~icons/custom/logo.jsx";

Page.noAuth = true;
export default function Page() {
  const { query } = useRouter();
  const callbackUrl = getQueryParam(query.callbackUrl);
  const error = getErrorMessage(getQueryParam(query.error));

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-app flex-col items-center justify-center p-4">
      <Logo />
      <p className="mb-6 text-xl">Unlock a world of informed shopping</p>
      {!!error && <p className="whitespace-pre-wrap text-center text-sm text-red-500">{error}</p>}
      <EmailSignIn callbackUrl={callbackUrl} />
      <div className="relative z-0 my-6 flex w-full justify-center">
        <hr className="absolute top-1/2 -z-10 w-full" />
        <span className="bg-white px-4 text-neutral-400">Or</span>
      </div>
      <ProviderSignIn callbackUrl={callbackUrl} />
    </div>
  );
}

type EmailSignInProps = { callbackUrl: string | undefined };
function EmailSignIn({ callbackUrl }: EmailSignInProps) {
  const [email, setEmail] = useState("");

  return (
    <form
      className="grid w-full grid-cols-2 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void signIn("email", { email, callbackUrl });
      }}
    >
      <WithLabel
        label="E-mail"
        className="col-span-2"
      >
        <Input
          value={email}
          required
          name="email"
          type="email"
          onChange={(e) => setEmail(e.target.value)}
        />
      </WithLabel>
      <Clickable
        variant="primary"
        type="submit"
        className="font-semibold"
      >
        Sign in
      </Clickable>
      <Clickable
        variant="primary"
        type="submit"
        className="font-semibold"
      >
        Sign up
      </Clickable>
    </form>
  );
}

type ProviderSignInProps = { callbackUrl: string | undefined };
function ProviderSignIn({ callbackUrl }: ProviderSignInProps) {
  return (
    <div className="grid w-full grid-cols-4 gap-3">
      {providers.map(([provider, Icon]) => (
        <Clickable
          variant="ghost"
          key={provider}
          aria-label={`sign in with ${provider}`}
          onClick={() => {
            void signIn(provider, { callbackUrl });
          }}
        >
          <Icon className="mx-auto h-7 w-7" />
        </Clickable>
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
  errorCode: ErrorCode | (string & NonNullable<unknown>) | undefined
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
