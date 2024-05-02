import { logToastError } from "@/components/toast";
import { useStableValue } from "@/state/stable";
import { useEffect, useRef, useState } from "react";
import type { BarcodeScanResult } from ".";
import { createReader } from ".";

type UseBarcodeScannerOptions = { onScan: (result: BarcodeScanResult) => void };
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

  return {
    /** Attach this ref to an {@link HTMLVideoElement} */
    ref: videoRef,
  };
}
