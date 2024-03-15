import { browser } from "@/browser";
import { Store } from "@/state/store";

const reviewPrivateDefaultKey = "review-private-default";

class ReviewPrivateDefaultStore extends Store<boolean> {
  setValue = (value: boolean) => {
    this.setState(value);
    localStorage.setItem(reviewPrivateDefaultKey, `${value}`);
  };
}

export const reviewPrivateDefaultStore = new ReviewPrivateDefaultStore(
  browser ? localStorage.getItem(reviewPrivateDefaultKey) !== "false" : true,
);
