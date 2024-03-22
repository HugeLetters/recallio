export {};

type RouteType = "public" | "private";
type RouteEnd<Marker extends symbol> = Record<Marker, RouteType>;
export type RouteMatcher<Marker extends symbol> =
  | RouteEnd<Marker>
  | {
      [chunk in string]: RouteMatcher<Marker>;
    };
