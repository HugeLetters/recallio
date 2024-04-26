import type { ApiRouter } from "@/server/api/router";
import type { AnyProcedure, AnyQueryProcedure, AnyRouterDef, Router } from "@trpc/server";

type innerRouterProcedurePath<
  TRouter,
  Filter extends AnyProcedure,
  Name extends Extract<keyof TRouter, string> = Extract<keyof TRouter, string>,
> = Name extends Name
  ? TRouter[Name] extends Router<AnyRouterDef>
    ? `${Name}.${innerRouterProcedurePath<TRouter[Name], Filter>}`
    : TRouter[Name] extends Filter
      ? Name
      : never
  : never;

type RouterProcedurePath<
  TRouter extends Router<AnyRouterDef>,
  Filter extends AnyProcedure,
> = innerRouterProcedurePath<TRouter["_def"]["procedures"], Filter>;

export type QueryPath = RouterProcedurePath<ApiRouter, AnyQueryProcedure>;
