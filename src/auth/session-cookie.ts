import { getCookies, setCookie } from "@/encode/cookie";
import { encodeJSON } from "@/encode/json";
import type { BaseObject } from "@/utils/object";
import { hasProperty, isObject } from "@/utils/object";
import { isSome } from "@/utils/option";
import type { Nullish } from "@/utils/type";
import type { Session } from "next-auth";

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
export const cookieSession = isSome(cookies) ? assertSession(cookies.value["session-data"]) : null;

function assertSession(value: unknown): Session | null {
  if (!isObject(value)) return null;
  if (!hasUser(value)) return null;
  if (!hasStringProperty(value, "expires")) return null;
  return value;
}

function hasUser(value: BaseObject): value is { user: Session["user"] } {
  if (!hasProperty(value, "user")) return false;
  if (!isObject(value.user)) return false;

  const user = assertUser(value.user);
  if (!user) return false;
  return true;
}

function assertUser(value: BaseObject): Session["user"] | null {
  if (!hasStringProperty(value, "id")) return null;
  if (!hasStringProperty(value, "name")) return null;
  if (!hasOptionalStringProperty(value, "email")) return null;
  if (!hasOptionalStringProperty(value, "image")) return null;
  return value;
}

function hasStringProperty<K extends string>(
  object: BaseObject,
  key: K,
): object is Record<K, string> {
  return hasProperty(object, key) && typeof object[key] === "string";
}

function hasOptionalStringProperty<K extends string>(
  value: BaseObject,
  key: K,
): value is Partial<Record<K, Nullish<string>>> {
  if (!hasProperty(value, key)) return true;
  const prop = value[key];
  return typeof prop === "string" || prop == null;
}
