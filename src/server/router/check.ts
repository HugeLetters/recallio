import type { RouteType } from "./matcher";
import { dynamic, routeEnd, routeMatcher } from "./matcher";

export function getRouteInfo(pathname: string): RouteType {
  const chunks = pathname.split("/");
  let node = routeMatcher;
  for (const chunk of chunks) {
    if (!chunk) continue;
    const nextNode = node[chunk in node ? chunk : dynamic];
    if (!nextNode) return "public";
    node = nextNode;
  }
  return node[routeEnd] ?? "public";
}
