/**
 * Some function which may be useful during development
 * @module utils/dev
 */

if (process.env.NODE_ENV !== "development") {
  throw Error("Do not use this module outside of development");
}

export function createTimer() {
  let time = performance.now();
  return function (label?: string) {
    const t = performance.now();
    const elapsed = t - time;
    console.log(`${label ?? "TIMER"}: ${elapsed}`);
    time = t;
    return elapsed;
  };
}

export function wait(time: number) {
  return new Promise<void>((res) => {
    setTimeout(res, time);
  });
}
