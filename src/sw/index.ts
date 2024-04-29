import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { NavigationCache } from "./navigation";
import { SessionCache } from "./session";
import { TrpcCache } from "./trpc";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST?: Array<PrecacheEntry | string>;
  }
}

declare const self: ServiceWorkerGlobalScope;

// todo - check defaultCache strategies

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    new SessionCache(),
    new TrpcCache(["user.review.getOne"]),
    new NavigationCache(),
  ],
});

serwist.addEventListeners();
