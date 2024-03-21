import type { Option } from "@/utils/option";

export function encodeJSON<V>(value: V) {
  return Buffer.from(JSON.stringify(value ?? null)).toString("base64");
}

export function decodeJSON(value: string): Option<unknown> {
  try {
    const string = Buffer.from(value, "base64").toString();
    return { ok: true, value: JSON.parse(string) };
  } catch (e) {
    console.error(e);
    return { ok: false };
  }
}
