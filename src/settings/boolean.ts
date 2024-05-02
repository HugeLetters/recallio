import { browser } from "@/browser";
import { Store } from "@/state/store";

class BooleanSettingStore extends Store<boolean> {
  constructor(
    private key: string,
    private initial: boolean,
  ) {
    super(initializeStore(key, initial));
    if (!browser) return;

    window.addEventListener("storage", (ev) => {
      if (ev.key !== key) return;
      this.setState(ev.newValue !== null ? stringToBoolean(ev.newValue) : initial);
    });
  }

  setValue = (value: boolean) => {
    this.setState(value);
    localStorage.setItem(this.key, `${value}`);
  };
  getServerSnapshot = () => this.initial;
}

function initializeStore(key: string, initial: boolean): boolean {
  if (!browser) return initial;

  const localValue = localStorage.getItem(key);
  if (localValue === null) {
    localStorage.setItem(key, `${initial}`);
    return initial;
  }

  return stringToBoolean(localValue);
}

function stringToBoolean(value: string) {
  return value !== "false";
}

export const reviewPrivateDefaultStore = new BooleanSettingStore("review-private-default", true);
export const scrollUpButtonEnabledStore = new BooleanSettingStore("scroll-up-button", true);
export type { BooleanSettingStore };
