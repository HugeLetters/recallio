import type { RuntimeCaching } from "serwist";
import { ExpirationPlugin, NetworkFirst, StaleWhileRevalidate } from "serwist";

export class ImageCache implements RuntimeCaching {
  matcher: RuntimeCaching["matcher"] = ({ request }) => {
    return request.destination === "image";
  };
  handler = new StaleWhileRevalidate({
    cacheName: "image",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        maxAgeFrom: "last-used",
      }),
    ],
  });
}

export class PageDataCache implements RuntimeCaching {
  matcher: RuntimeCaching["matcher"] = ({ url }) => {
    return url.pathname.startsWith("/_next/data") && url.pathname.endsWith(".json");
  };
  handler = new NetworkFirst({
    cacheName: "next-page-data",
    plugins: [new ExpirationPlugin({ maxEntries: 32 })],
  });
}

export class SessionCache implements RuntimeCaching {
  matcher: RuntimeCaching["matcher"] = "/api/auth/session";
  handler = new NetworkFirst({ cacheName: "session" });
}
