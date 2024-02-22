import { useSyncExternalStore } from "react";

type Subscription = () => void;
type Unsubscribe = () => void;
type Subscribe = (subscription: Subscription) => Unsubscribe;
export class Store<V> {
  constructor(protected state: V) {}
  private subscriptions = new Set<Subscription>();
  protected emitUpdate() {
    for (const subscription of this.subscriptions) {
      subscription();
    }
  }
  subscribe: Subscribe = (onStoreChange) => {
    this.subscriptions.add(onStoreChange);
    return () => {
      this.subscriptions.delete(onStoreChange);
    };
  };
  getSnapshot = () => this.state;
  getServerSnapshot = this.getSnapshot;
}

export function useStore<S>(store: Store<S>) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
