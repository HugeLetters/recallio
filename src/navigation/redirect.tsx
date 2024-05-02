import type { Nullish } from "@/utils/type";
import { useRouter } from "next/router";
import { route as serialize } from "nextjs-routes";
import { useEffect } from "react";
import { getQueryParam } from "./query";
import type { Route, StaticRoute } from "./type";

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

    router.replace(url as Route).catch(console.error);
  }, [router.isReady, router, url]);

  return null;
}

export function useRedirectQuery(param: string, fallback: Route) {
  const router = useRouter();
  return asRoute(getQueryParam(router.query[param]) ?? resolveRoute(fallback));
}

function resolveRoute(route: Route): string {
  if (typeof route === "string") return route;
  if ("pathname" in route) {
    return serialize(route);
  }
  return serialize({ ...route, pathname: "/404" });
}

function asRoute<T extends Nullish<string>>(to: T) {
  return to as Exclude<T, string> | Extract<StaticRoute, T>;
}
