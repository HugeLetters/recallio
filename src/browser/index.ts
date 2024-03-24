import { ignore } from "@/utils";
import { useRef, useSyncExternalStore } from "react";

export const browser = typeof window !== "undefined";

export function useHasMouse() {
  return useRef(browser ? matchMedia("(pointer:fine)").matches : false).current;
}

function subscription() {
  return ignore;
}
export function useClient() {
  return useSyncExternalStore(
    subscription,
    () => true,
    () => false,
  );
}

export function getBaseUrl() {
  if (browser) return ""; // browser should use relative url

  if (process.env.VERCEL) return `https://${process.env.NEXTAUTH_URL}`; // SSR should use vercel url

  return `http://localhost:${process.env.PORT ?? 1853}`; // dev SSR should use localhost
}
