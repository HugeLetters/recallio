import { Store } from ".";
import type { ExternalStore } from ".";

export class DerivedStore<R, V> implements ExternalStore<V> {
  private static uninitializedState = Symbol("uninitialized-derived-store");

  private source;
  private sourceState = DerivedStore.uninitializedState as R;
  private derivation;
  private sink;

  constructor(source: Store<R>, derivation: (value: R) => V) {
    this.source = source;
    this.derivation = derivation;
    this.sink = new SinkStore(DerivedStore.uninitializedState as V);
  }

  private syncDerivation(value: R) {
    if (this.sourceState === value) {
      return;
    }
    this.sourceState = value;

    const nextValue = this.derivation(value);
    this.sink.setValue(nextValue);
  }

  private subCount = 0;
  private sourceUnsub() {
    void 0;
  }
  subscribe: ExternalStore<V>["subscribe"] = (subscriber) => {
    const sinkUnsub = this.sink.subscribe(subscriber);
    this.subCount += 1;

    if (this.subCount === 1) {
      this.sourceUnsub = this.source.subscribe((value) => {
        this.syncDerivation(value);
      });
    }

    return () => {
      sinkUnsub();
      this.subCount -= 1;

      if (this.subCount === 0) {
        this.sourceUnsub();
      }
    };
  };

  getSnapshot = (): V => {
    const state = this.source.getSnapshot();
    this.syncDerivation(state);

    return this.sink.getSnapshot();
  };

  getServerSnapshot = () => {
    return this.getSnapshot();
  };
}

class SinkStore<V> extends Store<V> {
  setValue(value: V) {
    return this.setState(value);
  }
}
