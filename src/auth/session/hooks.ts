import { signIn } from "@/auth";
import { browser, useClient } from "@/browser";
import { logToastError } from "@/interface/toast";
import { useSession } from "next-auth/react";
import { getCookieSession } from "./cookie";

const sessionCache = browser ? getCookieSession() : null;
export const useCachedSession: typeof useSession = function (opts) {
  const ctx = useSession(opts);
  const isClient = useClient();
  if (!isClient || !!ctx.data) return ctx;

  return { ...ctx, data: sessionCache };
};

export function useRequiredSession() {
  return useCachedSession({ required: true, onUnauthenticated });
}

function onUnauthenticated() {
  signIn().catch(logToastError("Authentication error.\nPlease reload the page."));
}
