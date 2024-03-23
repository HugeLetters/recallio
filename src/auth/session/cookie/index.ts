import { getCookies, setCookie } from "@/encode/cookie";
import { encodeJSON } from "@/encode/json";
import type { Session } from "next-auth";
import { sessionDataCookieName } from "./name";
import { parseSession } from "./validation";

export function setSessionDataCookie(data: Session | null) {
  return setCookie({
    name: sessionDataCookieName,
    value: data ? encodeJSON(data) : "",
    expiry: data ? new Date(data.expires) : new Date(),
    path: "/",
    sameSite: "lax",
    secure: true,
  });
}

export function getCookieSession() {
  const cookies = getCookies();
  return parseSession(cookies[sessionDataCookieName]);
}
