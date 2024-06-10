import type { Option } from "@/utils/option";
import { none, some } from "@/utils/option";

export function encodeJSON(value: unknown) {
  return Buffer.from(encodeURIComponent(JSON.stringify(value ?? null))).toString("base64");
}

export function decodeJSON(value: string): Option<unknown> {
  try {
    const string = Buffer.from(value, "base64").toString();
    return some(JSON.parse(decodeURIComponent(string)));
  } catch (e) {
    console.error(e);
    return none;
  }
}
