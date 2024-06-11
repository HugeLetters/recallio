import { Store } from "@/state/store";

class RootStore extends Store<HTMLDivElement | null> {
  setRef = this.setState.bind(this);
}
export const layoutRootStore = new RootStore(null);
export const layoutMainStore = new RootStore(null);
