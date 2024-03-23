import { getCookies, setCookie } from "@/encode/cookie";
import { encodeJSON } from "@/encode/json";
import { isSome } from "@/utils/option";
import type { Session } from "next-auth";
import { parseSession } from "./validation";

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

const cookies = getCookies();
export const cookieSession = isSome(cookies) ? parseSession(cookies.value["session-data"]) : null;
