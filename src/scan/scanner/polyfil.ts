import type { ReaderOptions } from "zxing-wasm/reader";
import { getZXingModule } from "zxing-wasm/reader";
import type { BarcodeScanner } from "./type";

function preloadModule() {
  getZXingModule().catch(console.error);
}

export class PolyfilBarcodeScanner implements BarcodeScanner {
  scanBlob = (blob: Blob) => {
    return scanFile(blob).then(([result]) => result?.text ?? null);
  };

  scanUrl(url: string) {
    return fetch(url)
      .then((res) => res.blob())
      .then(this.scanBlob);
  }

  private readonly getVideoImageData = createVideoImageDataProducer();
  scanVideo(video: HTMLVideoElement) {
    const imageData = this.getVideoImageData?.(video);
    if (!imageData) {
      return Promise.reject(new Error("No ImageData"));
    }

    return scanImageData(imageData).then(([result]) => result?.text ?? null);
  }
}

const readerOptions: ReaderOptions = { maxNumberOfSymbols: 1 };
function scanImageData(data: ImageData) {
  return import("zxing-wasm/reader").then(({ readBarcodesFromImageData }) =>
    readBarcodesFromImageData(data, readerOptions),
  );
}

function scanFile(file: Blob) {
  return import("zxing-wasm/reader").then(({ readBarcodesFromImageFile }) =>
    readBarcodesFromImageFile(file, readerOptions),
  );
}

function createVideoImageDataProducer() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
    willReadFrequently: true,
  });
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
