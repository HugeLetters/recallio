import { DerivedStore, Store } from "@/state/store";
import type { TupleIndex } from "@/utils/array";
import { indexOf } from "@/utils/array";

export const scanTypeList = ["upload", "scan", "input"] as const;
export type ScanType = (typeof scanTypeList)[number];

class ScanTypeStore extends Store<ScanType> {
  select(scanType: ScanType) {
    this.setState(scanType);
  }
  move(by: number) {
    this.updateState((state) => {
      const currentIndex = indexOf(scanTypeList, state);
      const fallbackIndex: TupleIndex<typeof scanTypeList> = by > 0 ? 2 : 0;
      return scanTypeList[(currentIndex ?? fallbackIndex) + by] ?? scanTypeList[fallbackIndex];
    });
  }
  reset() {
    this.setState("scan");
  }
}

export const scanTypeStore = new ScanTypeStore("scan");
/** Gives current offset of scan type value from the center in the range from 0 to 1. */
export const scanTypeOffsetStore = new DerivedStore(
  scanTypeStore,
  (state) => ((indexOf(scanTypeList, state) ?? 2) - 1) / scanTypeList.length,
);
