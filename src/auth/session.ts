import { signIn } from "@/auth";
import { useClient } from "@/browser";
import { logToastError } from "@/components/toast";
import { useSession as useNextAuthSession } from "next-auth/react";
import { useMemo } from "react";
import { cookieSession } from "./session-cookie";

export const useSession: typeof useNextAuthSession = function (opts) {
  const ctx = useNextAuthSession(opts);
  const isClient = useClient();

  return useMemo(() => {
    if (!isClient) return ctx;

    return { ...ctx, data: ctx.data ?? cookieSession };
  }, [isClient, ctx]);
};

export function useRequiredSession() {
  return useSession({ required: true, onUnauthenticated });
}

function onUnauthenticated() {
  signIn().catch(logToastError("Authentication error.\nPlease reload the page."));
}
