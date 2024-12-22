import { ignore } from "@/utils";
import { useEffect, useState, useSyncExternalStore } from "react";

export const browser = typeof window !== "undefined";

export function useMediaQuery(query: MediaQueryList | null) {
  const [matches, setMatches] = useState(() => query?.matches ?? false);

  useEffect(() => {
    if (!query) {
      return;
    }

    function listener(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }
    query.addEventListener("change", listener);
    return () => {
      query.removeEventListener("change", listener);
    };
  }, [query]);

  return matches;
}

const mouseQuery = browser ? matchMedia("(pointer:fine)") : null;
export function useHasMouse() {
  return useMediaQuery(mouseQuery);
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
