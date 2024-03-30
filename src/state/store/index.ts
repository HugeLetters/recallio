import { useSyncExternalStore } from "react";

type Subscription<V> = (newState: V) => void;
type Unsubscribe = () => void;
type Subscribe<V> = (subscription: Subscription<V>) => Unsubscribe;
export class Store<V> {
  constructor(private state: V) {}
  private subscriptions = new Set<Subscription<V>>();
  private emitUpdate() {
    for (const subscription of this.subscriptions) {
      subscription(this.state);
    }
  }
  protected setState(value: V) {
    if (value === this.state) return;
    this.state = value;
    this.emitUpdate();
  }
  protected updateState(updater: (prevState: V) => V) {
    this.setState(updater(this.state));
  }
  subscribe: Subscribe<V> = (onStoreChange) => {
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

// todo - make a hook instead? hmm
export class DerivedStore<R, V> extends Store<V> {
  constructor(store: Store<R>, derivation: (value: R) => V) {
    super(derivation(store.getSnapshot()));
    store.subscribe((state) => {
      this.setState(derivation(state));
    });
  }
}
