import { signIn } from "@/auth";
import { useClient } from "@/browser";
import { logToastError } from "@/components/toast";
import { useSession } from "next-auth/react";
import { cookieSession } from "./cookie";

export const useCachedSession: typeof useSession = function (opts) {
  const ctx = useSession(opts);
  const isClient = useClient();
  if (!isClient || !cookieSession) return ctx;
  return { ...ctx, data: ctx.data ?? cookieSession };
};

export function useRequiredSession() {
  return useCachedSession({ required: true, onUnauthenticated });
}

function onUnauthenticated() {
  signIn().catch(logToastError("Authentication error.\nPlease reload the page."));
}
