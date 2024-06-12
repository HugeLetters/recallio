import type { BaseObject } from "@/utils/object";
import { hasProperty, isObject } from "@/utils/object";
import type { Nullish } from "@/utils/type";
import type { Session } from "next-auth";

export function parseSession(value: unknown): Session | null {
  if (!isObject(value)) return null;
  if (!assertUser(value)) return null;
  if (!hasStringProperty(value, "expires")) return null;
  return value;
}

function assertUser(value: BaseObject): value is { user: Session["user"] } {
  if (!hasProperty(value, "user")) return false;
  if (!isObject(value.user)) return false;

  const user = parseUser(value.user);
  if (!user) return false;
  return true;
}

function parseUser(value: BaseObject): Session["user"] | null {
  if (!hasStringProperty(value, "id")) return null;
  if (!hasStringProperty(value, "name")) return null;
  if (!hasOptionalStringProperty(value, "email")) return null;
  if (!hasOptionalStringProperty(value, "image")) return null;
  if (!hasStringProperty(value, "role")) return null;

  return value as never as Session["user"];
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
