import type { Nullish } from "@/utils/type";
import { route as serialize } from "nextjs-routes";
import type { Route, StaticRoute } from "./type";

export function resolveRoute(route: Route): string {
  if (typeof route === "string") return route;
  if ("pathname" in route) {
    return serialize(route);
  }
  return serialize({ ...route, pathname: "/404" });
}

export function asRoute<T extends Nullish<string>>(to: T) {
  return to as Exclude<T, string> | Extract<StaticRoute, T>;
}
