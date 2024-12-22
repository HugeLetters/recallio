import { logger } from "@/logger";
import type { ReadResult, ReaderOptions } from "zxing-wasm/reader";
import type { BarcodeScanner } from "./type";
import { isVideoReady } from "./util";

export class PolyfilBarcodeScanner implements BarcodeScanner {
  constructor() {
    preloadModule();
  }

  scanBlob(blob: Blob) {
    return scanFile(blob).then(grabFirstResult);
  }

  scanUrl(url: string) {
    return fetch(url)
      .then((res) => res.blob())
      .then((blob) => this.scanBlob(blob));
  }

  private readonly getVideoImageData = createVideoImageDataProducer();
  scanVideo(video: HTMLVideoElement) {
    const imageData = this.getVideoImageData?.(video);
    if (!imageData) {
      return Promise.resolve(null);
    }

    return scanImageData(imageData).then(grabFirstResult);
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
    return null;
  }

  return function (video: HTMLVideoElement) {
    if (!isVideoReady(video)) {
      return null;
    }

    const { videoWidth, videoHeight } = video;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    return ctx.getImageData(0, 0, videoWidth, videoHeight);
  };
}

function preloadModule() {
  import("zxing-wasm/reader").then(({ getZXingModule }) => getZXingModule()).catch(logger.error);
}

function grabFirstResult([result]: ReadResult[]) {
  return result?.text ?? null;
}
