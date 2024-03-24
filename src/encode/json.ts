import type { Option } from "@/utils/option";

export function encodeJSON<V>(value: V) {
  return btoa(JSON.stringify(value ?? null));
}

export function decodeJSON(value: string): Option<unknown> {
  try {
    return { ok: true, value: JSON.parse(atob(value)) };
  } catch (e) {
    console.error(e);
    return { ok: false };
  }
}
