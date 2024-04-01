import { Transition } from "@/animation/transition";
import { useStore } from "@/state/store";
import { TrackerStore } from "@/state/store/tracker";
import { Spinner } from "./spinner";

export const loadingTracker = new TrackerStore();

export function LoadingProvider() {
  const show = useStore(loadingTracker);

  return (
    <Transition outClassName="animate-fade-in-reverse">
      {show && (
        <Spinner className="pointer-events-none fixed bottom-2 right-2 z-20 h-10 animate-fade-in rounded-full bg-neutral-400/25 p-1 contrast-200" />
      )}
    </Transition>
  );
}
