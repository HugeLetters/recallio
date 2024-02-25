import { ignore } from "@/utils";
import { useSyncExternalStore } from "react";

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
