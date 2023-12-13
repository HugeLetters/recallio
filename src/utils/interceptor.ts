import { rest, setupWorker } from "msw";
import { browser } from ".";

/** During development adds latency to API calls to mock real-life scenario */
export default function setupInterceptor() {
  if (!browser) return;

  const worker = setupWorker(
    rest.all("/api/*", async (req) => {
      const delayDuration = randInt(100, 500);
      console.log(`Delaying request to ${req.url.href} for ${delayDuration}ms`);
      await delay(delayDuration);
      return req.passthrough();
    }),
  );

  void worker.start().catch(console.error);
  return worker;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}
