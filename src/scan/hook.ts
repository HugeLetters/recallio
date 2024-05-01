import { logToastError } from "@/components/toast";
import { useStableValue } from "@/state/stable";
import type { Result } from "@zxing/library";
import { BrowserMultiFormatReader } from "@zxing/library";
import { useEffect, useRef, useState } from "react";

function createReader() {
  // todo - check hints
  const reader = new BrowserMultiFormatReader(undefined);
  reader.timeBetweenDecodingAttempts = 1000;
  return reader;
}

type UseBarcodeScannerOptions = { onScan: (result: Result) => void };
export function useBarcodeScanner({ onScan }: UseBarcodeScannerOptions) {
  const [videoReader] = useState(createReader);
  const onScanStable = useStableValue(onScan);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    videoReader
      .decodeFromConstraints(
        { video: { facingMode: "environment" }, audio: false },
        video,
        (result) => {
          if (result) {
            onScanStable.current(result);
          }
        },
      )
      .catch(
        logToastError(
          "Coludn't start the scanner.\nMake sure camera access is granted and reload the page.",
          { id: "scanner start error" },
        ),
      );

    return () => {
      videoReader.reset();
    };
  }, [videoReader, onScanStable]);

  function scanFromUrl(url: string) {
    const reader = createReader();
    return (
      reader
        .decodeFromImageUrl(url)
        // we decode a second time on fail because xzing alternates between 2 scan modes on each decode
        .catch(() => reader.decodeFromImageUrl(url))
    );
  }
  function scanFile(image: File) {
    const url = URL.createObjectURL(image);
    return scanFromUrl(url).finally(() => {
      URL.revokeObjectURL(url);
    });
  }

  return {
    /** Attach this ref to an {@link HTMLVideoElement} */
    ref: videoRef,
    scanFromUrl,
    scanFile,
  };
}
