import { rest, setupWorker } from "msw";

export default function setupInterceptor() {
  if (typeof window === "undefined") return;

  const worker = setupWorker(
    rest.all("api/*", async (req) => {
      const delayDuration = randInt(3000, 3000);
      console.log(`Delaying request to ${req.url.href} for ${delayDuration}ms`);
      await delay(delayDuration);
      return req.passthrough();
    })
  );

  void worker.start().catch(console.error);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}
