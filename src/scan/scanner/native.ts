import type { BarcodeScanner } from "./type";

export class NativeBarcodeScanner implements BarcodeScanner {
  private readonly detector = new BarcodeDetector();
  scanBlob = (blob: Blob) => {
    return createImageBitmap(blob).then((bitmap) =>
      this.detector.detect(bitmap).then(([result]) => result?.rawValue ?? null),
    );
  };

  scanUrl(url: string) {
    return fetch(url)
      .then((res) => res.blob())
      .then(this.scanBlob);
  }

  scanVideo(video: HTMLVideoElement) {
    return this.detector.detect(video).then(([result]) => result?.rawValue ?? null);
  }
}

declare class BarcodeDetector {
  detect: (source: BarcodeSource) => Promise<Array<DetectedBarcode>>;
}

/** Android Chrome doesn't support {@link Blob} source despite what MDN claims */
type BarcodeSource = HTMLVideoElement | ImageBitmap | ImageData;
type DetectedBarcode = { rawValue: string };
