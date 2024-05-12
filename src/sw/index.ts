import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { ImageCache, PageDataCache, SessionCache } from "./misc";
import { NavigationCache } from "./navigation";
import { ShareTargetInterceptpr } from "./share/interceptor";
import { TrpcQueryCache } from "./trpc/query";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST?: Array<PrecacheEntry | string>;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST?.filter((entry) => {
    const name = typeof entry === "string" ? entry : entry.url;
    return !name.startsWith("/screenshot");
  }),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    new SessionCache(),
    new ImageCache(),
    new TrpcQueryCache(["user.review.getOne"]),
    new NavigationCache(),
    new PageDataCache(),
    new ShareTargetInterceptpr(),
  ],
  disableDevLogs: true,
});

serwist.addEventListeners();
