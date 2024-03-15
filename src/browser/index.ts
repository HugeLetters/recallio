import { ignore } from "@/utils";
import { useRef, useSyncExternalStore } from "react";

export const browser = typeof window !== "undefined";

export function useHasMouse() {
  return useRef(browser ? matchMedia("(pointer:fine)").matches : false).current;
}

function subscription() {
  return ignore;
}
export function useClient() {
  return useSyncExternalStore(
    subscription,
    () => true,
    () => false,
  );
}
