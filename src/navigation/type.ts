import type { LinkProps } from "next/link";

export type Route = LinkProps["href"];
export type StaticRoute = Extract<Route, string>;
