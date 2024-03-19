import type { Option } from "@/utils/option";

export function encodeJSON<V>(value: V) {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

export function decodeJSON(value: string): Option<unknown> {
  const string = Buffer.from(value, "base64").toString();
  try {
    return { ok: true, value: JSON.parse(string) };
  } catch (e) {
    return { ok: false };
  }
}
