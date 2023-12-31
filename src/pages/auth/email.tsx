import { Clickable } from "@/components/UI";
import { useRouter } from "next/router";
import { useState } from "react";
import EmailIcon from "~icons/carbon/email";

const PIN_LENGTH = 6;

// todo redirect if signed in
Page.noAuth = true;
export default function Page() {
  const router = useRouter();
  const [pin, setPin] = useState("");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col items-center justify-center p-4 text-center text-lime-950">
      <EmailIcon className="h-10 w-10" />
      <p className="text-2xl font-semibold">Registration PIN code</p>
      <div className="mt-2 text-xl font-medium text-neutral-400">
        <p>To complete registration, we have sent you a PIN code to your email address.</p>
        <p>Please enter it in the field below.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();

          const { callbackUrl, email } = router.query;
          void router.push({
            pathname: "/api/auth/[...nextauth]",
            query: {
              callbackUrl,
              email,
              token: pin.toUpperCase(),
              nextauth: ["callback", "email"],
            },
          });
        }}
        className="group flex w-full max-w-[360px] flex-col items-center gap-3"
      >
        <label className="group/input my-6 w-full cursor-text">
          <div className="grid w-full grid-cols-6 justify-center gap-2.5 uppercase">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-lg outline outline-1 outline-neutral-400/50 transition-[outline-color] group-focus-within/input:not-[:empty]:outline-app-green"
              >
                {pin[i]}
                {i === pin.length && (
                  <span className="invisible animate-ping text-app-green group-focus-within/input:visible">
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
            autoComplete="off"
            className="sr-only"
          />
        </label>
        <div className="w-full px-1">
          <Clickable
            variant="ghost"
            type="submit"
            className="w-full group-valid:bg-app-green group-valid:text-white group-invalid:transform-none group-invalid:cursor-default"
          >
            Submit PIN
          </Clickable>
        </div>
      </form>
    </div>
  );
}
