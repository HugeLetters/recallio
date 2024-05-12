export type BarcodeScanner = {
  scanBlob: (blob: Blob) => Promise<string>;
  scanUrl: (url: string) => Promise<string>;
  scanVideo: (video: HTMLVideoElement) => Promise<string>;
};
