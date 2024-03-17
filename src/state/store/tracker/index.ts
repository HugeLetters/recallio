import { Store } from "..";

export class TrackerStore extends Store<boolean> {
  constructor() {
    super(false);
  }
  private stack = new Set<string>();
  private computeState() {
    this.setState(!!this.stack.size);
  }
  add(value: string) {
    this.stack.add(value);
    this.computeState();
  }
  remove(value: string) {
    this.stack.delete(value);
    this.computeState();
  }
}
