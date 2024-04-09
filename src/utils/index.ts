export function clamp(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function minutesToMs(minutes: number) {
  return minutes * 60 * 1000;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && !!value;
}

export function ignore() {
  return;
}

export function createTimer() {
  let time = performance.now();
  return function () {
    const t = performance.now();
    console.log(t - time);
    time = t;
  };
}

export const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
