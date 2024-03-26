import { Store } from "@/state/store";

class RootStore extends Store<HTMLDivElement | null> {
  setRoot = this.setState.bind(this);
}
export const rootStore = new RootStore(null);
