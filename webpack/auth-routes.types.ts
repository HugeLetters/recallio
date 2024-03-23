export {};

export type RouteType = "public" | "private";
export type RouteMatcherTrie = { [x: string]: RouteMatcherTrie | RouteType };
