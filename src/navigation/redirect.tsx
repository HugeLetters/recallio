import { logger } from "@/logger";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getQueryParam } from "./query";
import { asRoute, resolveRoute } from "./route";
import type { Route } from "./type";

type RedirectProps = { to: Route };
export function Redirect({ to }: RedirectProps) {
  const router = useRouter();
  const url = resolveRoute(to);

  useEffect(() => {
    if (!router.isReady) return;

    if (location.href === new URL(url, location.origin).href) {
      console.warn(`Trying to redirect to the same URL "${url}". Aborting redirect.`);
      return;
    }

    router.replace(url as Route).catch(logger.error);
  }, [router.isReady, router, url]);

  return null;
}

export function useRedirectQuery(param: string, fallback: Route) {
  const router = useRouter();
  return asRoute(getQueryParam(router.query[param]) ?? resolveRoute(fallback));
}
