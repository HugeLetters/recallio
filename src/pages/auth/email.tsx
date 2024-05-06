import { Button } from "@/interface/button";
import type { NextPageWithLayout } from "@/layout";
import { Redirect, useRedirectQuery } from "@/navigation/redirect";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import EmailIcon from "~icons/carbon/email";

const PIN_LENGTH = 6;
const SLOTS = Array.from({ length: PIN_LENGTH }, (_, i) => i);
const Page: NextPageWithLayout = function () {
  const router = useRouter();
  const callbackUrl = useRedirectQuery("callbackUrl", "/profile");
  const { status } = useSession();

  const [pin, setPin] = useState("");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center p-4 text-center text-app-green-900">
      <Head>
        <title>email sign-in</title>
      </Head>
      {status === "authenticated" && <Redirect to={callbackUrl} />}
      <EmailIcon className="size-10" />
      <p className="text-2xl font-semibold">Authentication PIN code</p>
      <div className="mt-2 text-balance text-xl font-medium text-neutral-500">
        <p>To complete sign-in process, we have sent you a PIN code to your email address.</p>
        <p>Please enter it in the field below.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();

          const { email } = router.query;

          // FYI - on dev there is a bug that this doesn't cause a hard redirect
          // which causes useSession to keep it's previous session state which is "unauthenticated"
          router
            .push({
              pathname: "/api/auth/[...nextauth]",
              query: {
                callbackUrl,
                email,
                token: pin.toUpperCase(),
                nextauth: ["callback", "email"],
              },
            })
            .catch(console.error);
        }}
        className="group flex w-full max-w-[360px] flex-col items-center gap-3"
      >
        <label className="group/input my-6 w-full cursor-text">
          <div className="grid w-full grid-cols-6 justify-center gap-2.5 uppercase">
            {SLOTS.map((slot) => (
              <div
                key={slot}
                className="flex aspect-square items-center justify-center rounded-lg outline outline-1 outline-neutral-300 transition-[outline-color] group-focus-within/input:not-[:empty]:outline-app-green-500"
              >
                {pin[slot]}
                {slot === pin.length && (
                  <span className="invisible animate-ping text-app-green-500 group-focus-within/input:visible">
                    |
                  </span>
                )}
              </div>
            ))}
          </div>
          <input
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.slice(0, PIN_LENGTH));
            }}
            required
            minLength={PIN_LENGTH}
            maxLength={PIN_LENGTH}
            aria-label="Your authentication pin"
            autoFocus
            autoComplete="off"
            className="sr-only"
          />
        </label>
        <div className="w-full px-1">
          <Button
            type="submit"
            className="w-full group-valid:primary group-invalid:disabled group-invalid:ghost"
          >
            Submit PIN
          </Button>
        </div>
      </form>
    </div>
  );
};

Page.isPublic = true;

export default Page;
