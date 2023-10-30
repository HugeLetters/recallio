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
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col items-center justify-center gap-4 p-4 text-center">
      <EmailIcon className="h-10 w-10" />
      <p className="text-2xl font-semibold">Check your email</p>
      <div className="my-4 text-xl font-medium text-neutral-400">
        <p>An authorization PIN has been sent to your email address</p>
        <p>{"Don't forget to check your spam folder"}</p>
      </div>
      {/* todo - styling */}
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
        className="flex w-full flex-col items-center gap-3"
      >
        <label className="group w-full cursor-text p-2">
          <div className="flex w-full justify-around gap-3 uppercase">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-10 rounded-lg p-2 outline outline-app-green"
              >
                {pin[i]}
                {i === pin.length && (
                  <span className="invisible animate-ping text-app-green group-focus-within:visible">
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
        <Clickable
          variant="primary"
          type="submit"
          className="w-full"
        >
          Submit
        </Clickable>
      </form>
    </div>
  );
}
