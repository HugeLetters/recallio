import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { NavigationCache } from "./navigation";
import { SessionCache } from "./session";
import { ShareTargetInterceptpr } from "./share";
import { TrpcQueryCache } from "./trpc/query";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST?: Array<PrecacheEntry | string>;
  }
}

declare const self: ServiceWorkerGlobalScope;

// todo - check defaultCache strategies
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
    new TrpcQueryCache(["user.review.getOne"]),
    new NavigationCache(),
    new ShareTargetInterceptpr(),
  ],
});

serwist.addEventListeners();
