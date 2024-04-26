import type { NonEmptyArray } from "@/utils/array";
import type { RouteHandler, RouteMatchCallback, RuntimeCaching } from "serwist";
import { TrpcStrategy } from "./strategy";
import type { QueryPath } from "./type";

export class TrpcCache implements RuntimeCaching {
  constructor(private paths: NonEmptyArray<QueryPath>) {}

  matcher: RouteMatchCallback = ({ url }) => {
    const { pathname } = url;
    if (!pathname.startsWith("/api/trpc/")) return false;
    return this.paths.some((path) => pathname.includes(path));
  };

  handler: RouteHandler = new TrpcStrategy(this.paths);
}
