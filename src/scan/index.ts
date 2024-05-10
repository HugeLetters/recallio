import type { ReaderOptions } from "zxing-wasm/reader";
import { getZXingModule, readBarcodesFromImageFile } from "zxing-wasm/reader";

const readerOptions: ReaderOptions = { maxNumberOfSymbols: 1 };
export function scanBlob(image: Blob): Promise<string> {
  return readBarcodesFromImageFile(image, readerOptions).then(([result]) => {
    if (!result) {
      throw new Error("No barcode detected.");
    }
    return result.text;
  });
}

export function scanFromUrl(url: string) {
  return fetch(url)
    .then((res) => res.blob())
    .then(scanBlob);
}

}
