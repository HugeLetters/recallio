import type { RuntimeCaching } from "serwist";
import { CacheFirst, ExpirationPlugin, Strategy } from "serwist";

declare const self: ServiceWorkerGlobalScope;
const OFFLINE_PATHNAME = "/~offline";
const CACHE_NAME = "navigation";

export class NavigationCache implements RuntimeCaching {
  matcher: RuntimeCaching["matcher"] = ({ request, sameOrigin }) => {
    return sameOrigin && request.mode === "navigate";
  };
  handler = new NavigationStrategy({
    cacheName: CACHE_NAME,
    matchOptions: { ignoreSearch: true },
  });
}

class NavigationStrategy extends Strategy {
  protected _handle: Strategy["_handle"] = (request, handler) => {
    const { url } = handler;

    const resource = handler.fetch(request);
    if (!url || url.pathname.startsWith("/api/")) return resource;

    if (url.pathname === OFFLINE_PATHNAME) {
      return resource
        .then((res) => {
          const cacheUpdate = handler.cachePut(OFFLINE_PATHNAME, res.clone());
          handler.waitUntil(cacheUpdate).catch(console.error);
          return res;
        })
        .catch(() => handler.cacheMatch(OFFLINE_PATHNAME));
    }

    return resource.catch(() => {
      const redirectUrl = new URL(OFFLINE_PATHNAME, url);
      redirectUrl.searchParams.set("redirect", url.toString());
      return Response.redirect(redirectUrl);
    });
  };
}

const precacheStrategy = new CacheFirst({
  cacheName: CACHE_NAME,
  matchOptions: { ignoreSearch: true },
  plugins: [
    new ExpirationPlugin({
      maxAgeSeconds: 60 * 60 * 24 * 14, // 14 days
    }),
  ],
});

self.addEventListener("activate", (event) => {
  const url = new URL(OFFLINE_PATHNAME, location.origin);
  const request = new Request(url);
  event.waitUntil(Promise.all(precacheStrategy.handleAll({ event, request, url })));
});
