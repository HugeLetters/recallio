import { browser } from "@/browser";
import { mapFilter } from "@/utils/array/filter";
import type { Option } from "@/utils/option";
import { isSome } from "@/utils/option";
import type { Nullish } from "@/utils/type";
import { decodeJSON } from "./json";

export function getCookies(): Option<Record<string, unknown>> {
  if (!browser) return { ok: false };

  const cookieEntries = mapFilter(
    document.cookie.split("; "),
    (cookie) => {
      const [key, value] = cookie.split("=");
      if (!key || !value) return null;

      const decoded = decodeURIComponent(value);
      const data = decodeJSON(decoded);

      return [key, isSome(data) ? data.value : decoded] as const;
    },
    (v, bad) => (v ? v : bad),
  );

  return { ok: true, value: Object.fromEntries(cookieEntries) };
}

type Cookie = {
  name: string;
  value: string;
  path?: string;
  expiry?: Date;
  secure?: boolean;
  sameSite?: string;
};
export function setCookie({ name, value, expiry, path, sameSite, secure }: Cookie) {
  if (!browser) return;
  const cookie = `${name}=${value}; ${cookieChunk("Expires", expiry?.toUTCString())} ${cookieChunk("Path", path)} ${cookieChunk("sameSite", sameSite)} ${cookieChunk("Secure", secure)}`;
  document.cookie = cookie;
}

function cookieChunk(name: string, value: Nullish<string | boolean>): string {
  if (!value) return "";
  if (typeof value === "boolean") return `${name};`;
  return `${name}=${value};`;
}
