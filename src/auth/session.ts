import { useSession } from "next-auth/react";
import { signIn } from "@/auth";
import { logToastError } from "@/components/toast";

export function useRequiredSession() {
  return useSession({
    required: true,
    onUnauthenticated,
  });
}

function onUnauthenticated() {
  signIn().catch(logToastError("Authentication error.\nPlease reload the page."));
}
