import { browser } from "@/browser";
import { Store } from "@/state/store";

class BooleanSettingStore extends Store<boolean> {
  private static initialize(key: string, initial: boolean): boolean {
    if (!browser) return initial;

    const localValue = localStorage.getItem(key);
    if (localValue === null) {
      localStorage.setItem(key, `${initial}`);
      return initial;
    }

    return localValue !== "false";
  }

  constructor(
    private key: string,
    private initial: boolean,
  ) {
    super(BooleanSettingStore.initialize(key, initial));
  }

  setValue = (value: boolean) => {
    this.setState(value);
    localStorage.setItem(this.key, `${value}`);
  };
  getServerSnapshot = () => this.initial;
}

export const reviewPrivateDefaultStore = new BooleanSettingStore("review-private-default", true);
export const scrollUpButtonEnabledStore = new BooleanSettingStore("scroll-up-button", true);
export type { BooleanSettingStore };
