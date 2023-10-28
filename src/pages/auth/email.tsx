import { Clickable } from "@/components/UI";
import EmailIcon from "~icons/carbon/email";

Page.noAuth = true;
export default function Page() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col items-center justify-center gap-4 p-4 text-center">
      <EmailIcon className="h-10 w-10" />
      <p className="text-2xl font-semibold">Check your email</p>
      <div className="my-4 text-xl font-medium text-neutral-400">
        <p>A sign in link has been sent to your email address</p>
        <p>{"Don't forget to check your spam folder"}</p>
      </div>
      <Clickable
        variant="primary"
        asLink
        // @ts-expect-error An external link to open email app
        href={"mailto:"}
        className="self-stretch"
      >
        Open the email app
      </Clickable>
    </div>
  );
}
