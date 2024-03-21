import { signIn } from "@/auth";
import { useClient } from "@/browser";
import { logToastError } from "@/components/toast";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { cookieSession } from "./session-cookie";

export const useCachedSession: typeof useSession = function (opts) {
  const ctx = useSession(opts);
  const isClient = useClient();

  return useMemo(() => {
    if (!isClient) return ctx;

    return { ...ctx, data: ctx.data ?? cookieSession };
  }, [isClient, ctx]);
};

export function useRequiredSession() {
  return useCachedSession({ required: true, onUnauthenticated });
}

function onUnauthenticated() {
  signIn().catch(logToastError("Authentication error.\nPlease reload the page."));
}
