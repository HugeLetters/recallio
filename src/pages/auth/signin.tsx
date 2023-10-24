import { Input, Clickable, WithLabel, providers } from "@/components/UI";
import { getQueryParam } from "@/utils";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import Logo from "~icons/custom/logo.jsx";

// todo - statically prerender, right?
// todo - error handling
Page.noAuth = true;
export default function Page() {
  const { query } = useRouter();
  const callbackUrl = getQueryParam(query.callbackUrl);

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-6 p-4">
      <Logo />
      <EmailSignIn callbackUrl={callbackUrl} />
      <div className="relative z-0 flex w-full justify-center">
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
    <div className="grid w-full grid-cols-2 gap-3">
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
