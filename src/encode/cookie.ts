import { browser } from "@/browser";
import { mapFilter } from "@/utils/array/filter";
import type { Option } from "@/utils/option";
import { isSome } from "@/utils/option";
import { decodeJSON } from "./json";

export function getCookies(): Option<Record<string, unknown>> {
  if (!browser) return { ok: false };

  const cookieEntries = mapFilter(
    document.cookie.split("; "),
    (cookie) => {
      const [key, value] = cookie.split("=");
      if (!key || !value) return null;

      const data = decodeJSON(decodeURIComponent(value));
      if (!isSome(data)) return null;

      return [key, data.value] as const;
    },
    (v, bad) => (v ? v : bad),
  );

  return { ok: true, value: Object.fromEntries(cookieEntries) };
}
