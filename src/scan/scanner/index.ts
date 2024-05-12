import { hasProperty } from "@/utils/object";
import { NativeBarcodeScanner } from "./native";
import { PolyfilBarcodeScanner } from "./polyfil";
import type { BarcodeScanner } from "./type";

export function createBarcodeScanner(): BarcodeScanner {
  if (hasProperty(globalThis, "BarcodeDetector")) {
    return new NativeBarcodeScanner();
  }

  return new PolyfilBarcodeScanner();
}
