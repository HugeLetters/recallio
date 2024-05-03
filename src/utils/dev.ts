/**
 * Some function which may be useful during development
 * @module utils/dev
 */
import { env } from "@/server/env/index.mjs";
import { useEffect, useState } from "react";

if (env.NEXT_PUBLIC_NODE_ENV !== "development") {
  throw Error("Do not use this module outside of development");
}

export function useDelayed(delay: number) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setValue(true);
    }, delay);

    return () => {
      clearTimeout(t);
    };
  }, [delay]);

  return value;
}

export function createTimer() {
  let time = performance.now();
  return function (label?: string) {
    const t = performance.now();
    console.log(`${label ?? "TIMER"}: ${t - time}`);
    time = t;
  };
}

export function wait(time: number) {
  return new Promise<void>((res) => {
    setTimeout(() => {
      res();
    }, time);
  });
}
