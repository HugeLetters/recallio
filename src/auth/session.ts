import { signIn } from "@/auth";
import { logToastError } from "@/components/toast";
import { setCookie } from "@/encode/cookie";
import { encodeJSON } from "@/encode/json";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";

export function useRequiredSession() {
  return useSession({
    required: true,
    onUnauthenticated,
  });
}

function onUnauthenticated() {
  signIn().catch(logToastError("Authentication error.\nPlease reload the page."));
}

export function setSessionDataCookie(data: Session | null) {
  return setCookie({
    name: "session-data",
    value: data ? encodeJSON(data) : "",
    expiry: data ? new Date(data.expires) : new Date(),
    path: "/",
    sameSite: "lax",
    secure: true,
  });
}
