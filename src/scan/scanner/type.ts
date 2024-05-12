export type BarcodeScanner = {
  scanBlob: (blob: Blob) => Promise<string | null>;
  scanUrl: (url: string) => Promise<string | null>;
  scanVideo: (video: HTMLVideoElement) => Promise<string | null>;
};
