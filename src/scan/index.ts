import { hasProperty } from "@/utils/object";
import type { ReaderOptions } from "zxing-wasm/reader";
import {
  readBarcodesFromImageData,
  readBarcodesFromImageFile,
} from "zxing-wasm/reader";

const readerOptions: ReaderOptions = { maxNumberOfSymbols: 1 };
export class BarcodeScanner {
  private readonly native: BarcodeDetector | null = null;
  private readonly getVideoImageData = createVideoImageDataProducer();

  constructor() {
    if (hasProperty(globalThis, "BarcodeDetector")) {
      this.native = new BarcodeDetector();
    }
  }

  scanBlob = (blob: Blob): Promise<string> => {
    const { native } = this;
    if (native) {
      return createImageBitmap(blob).then((bitmap) =>
        native.detect(bitmap).then(([result]) => {
          if (!result) {
            throw new BarcodeDetectionError("No barcode detected.");
          }
          return result.rawValue;
        }),
      );
    }

    return readBarcodesFromImageFile(blob, readerOptions).then(([result]) => {
      if (!result) {
        throw new BarcodeDetectionError("No barcode detected.");
      }
      return result.text;
    });
  };

  scanUrl(url: string): Promise<string> {
    return fetch(url)
      .then((res) => res.blob())
      .then(this.scanBlob);
  }

  scanVideo(video: HTMLVideoElement): Promise<string> {
    if (this.native) {
      return this.native.detect(video).then(([result]) => {
        if (!result) {
          throw new BarcodeDetectionError("No barcode detected.");
        }
        return result.rawValue;
      });
    }

    const imageData = this.getVideoImageData?.(video);
    if (!imageData) {
      return Promise.reject(new Error("No ImageData"));
    }

    return readBarcodesFromImageData(imageData, readerOptions).then(([result]) => {
      if (!result) {
        throw new BarcodeDetectionError("No barcode detected.");
      }
      return result.text;
    });
  }
}

declare class BarcodeDetector {
  detect: (source: BarcodeSource) => Promise<Array<DetectedBarcode>>;
}

/** Android Chrome doesn't support {@link Blob} source despite what MDN claims */
type BarcodeSource = HTMLVideoElement | ImageBitmap | ImageData;
type DetectedBarcode = { rawValue: string };

function createVideoImageDataProducer() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    // todo - maybe throw?
    return null;
  }

  return function (video: HTMLVideoElement) {
    const { videoWidth, videoHeight } = video;
    if (videoWidth * videoHeight === 0) return null;

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    return ctx.getImageData(0, 0, videoWidth, videoHeight);
  };
}

export class BarcodeDetectionError extends Error {}
