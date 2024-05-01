import { BrowserMultiFormatReader } from "@zxing/library";
import type { Result } from "@zxing/library";

export type BarcodeScanResult = Result;
export function createReader() {
  // todo - check hints
  const reader = new BrowserMultiFormatReader(undefined);
  reader.timeBetweenDecodingAttempts = 1000;
  return reader;
}

export function scanFromUrl(url: string) {
  const reader = createReader();
  return (
    reader
      .decodeFromImageUrl(url)
      // we decode a second time on fail because xzing alternates between 2 scan modes on each decode
      .catch(() => reader.decodeFromImageUrl(url))
  );
}

export function scanFile(image: File) {
  const url = URL.createObjectURL(image);
  return scanFromUrl(url).finally(() => {
    URL.revokeObjectURL(url);
  });
}
