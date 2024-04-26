import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { TrpcCache } from "./trpc";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// todo - check defaultCache strategies

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [new TrpcCache(["user.review.getOne"])],
});

serwist.addEventListeners();
