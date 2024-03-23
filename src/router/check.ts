import type { RouteType } from "./matcher";
import { dynamic, routeEnd, routeMatcher } from "./matcher";

type MatcherNode = typeof routeMatcher;
export function getRouteInfo(pathname: string): RouteType {
  const chunks = pathname.split("/");
  let node = routeMatcher;
  for (const chunk of chunks) {
    if (!chunk) continue;
    const nextNode = getNextNode(node, chunk);
    if (!nextNode) return "public";
    node = nextNode;
  }
  return node[routeEnd] ?? "public";
}

function getNextNode(node: MatcherNode, chunk: string) {
  if (chunk in node) return node[chunk];
  return node[dynamic];
}
