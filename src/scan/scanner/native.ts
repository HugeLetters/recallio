import type { BarcodeScanner } from "./type";
import { isVideoReady } from "./util";

export class NativeBarcodeScanner implements BarcodeScanner {
  private readonly detector = new BarcodeDetector();
  scanBlob(blob: Blob) {
    return createImageBitmap(blob).then((bitmap) =>
      this.detector.detect(bitmap).then(grabFirstResult),
    );
  }

  scanUrl(url: string) {
    return fetch(url)
      .then((res) => res.blob())
      .then((blob) => this.scanBlob(blob));
  }

  scanVideo(video: HTMLVideoElement) {
    if (!isVideoReady(video)) {
      return Promise.resolve(null);
    }

    return this.detector.detect(video).then(grabFirstResult);
  }
}

function grabFirstResult([result]: DetectedBarcode[]) {
  return result?.rawValue ?? null;
}

declare class BarcodeDetector {
  detect: (source: BarcodeSource) => Promise<Array<DetectedBarcode>>;
}

/** Android Chrome doesn't support {@link Blob} source despite what MDN claims */
type BarcodeSource = HTMLVideoElement | ImageBitmap | ImageData;
type DetectedBarcode = { rawValue: string };
