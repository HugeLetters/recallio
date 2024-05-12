import { BarcodeDetectionError } from "./error";
import type { BarcodeScanner } from "./type";

export class NativeBarcodeScanner implements BarcodeScanner {
  private readonly detector = new BarcodeDetector();
  scanBlob = (blob: Blob): Promise<string> => {
    return createImageBitmap(blob).then((bitmap) =>
      this.detector.detect(bitmap).then(([result]) => {
        if (!result) {
          throw new BarcodeDetectionError("No barcode detected.");
        }
        return result.rawValue;
      }),
    );
  };

  scanUrl(url: string): Promise<string> {
    return fetch(url)
      .then((res) => res.blob())
      .then(this.scanBlob);
  }

  scanVideo(video: HTMLVideoElement): Promise<string> {
    return this.detector.detect(video).then(([result]) => {
      if (!result) {
        throw new BarcodeDetectionError("No barcode detected.");
      }
      return result.rawValue;
    });
  }
}

declare class BarcodeDetector {
  detect: (source: BarcodeSource) => Promise<Array<DetectedBarcode>>;
}

/** Android Chrome doesn't support {@link Blob} source despite what MDN claims */
type BarcodeSource = HTMLVideoElement | ImageBitmap | ImageData;
type DetectedBarcode = { rawValue: string };
