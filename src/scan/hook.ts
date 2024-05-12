import { browser } from "@/browser";
import { logToastError } from "@/interface/toast";
import { useStableValue } from "@/state/stable";
import { useEffect, useRef, useState } from "react";
import { createBarcodeScanner } from "./scanner";
import { BarcodeDetectionError } from "./scanner/error";

type UseBarcodeScannerOptions = { onScan: (result: string) => void };
export function useBarcodeScanner({ onScan }: UseBarcodeScannerOptions) {
  const [scanner] = useState(() => (browser ? createBarcodeScanner() : null));
  const onScanStable = useStableValue(onScan);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scanner) return;

    const cleanupCamera = attachCameraStream(video);

    const scan = function () {
      scanner
        .scanVideo(video)
        .then(onScanStable.current)
        .catch((e) => {
          if (e instanceof BarcodeDetectionError) return;
          // todo - toast?
          console.error(e);
        })
        .finally(() => {
          // todo - this is the wrong way to time
          timeOut = window.setTimeout(scan, 500);
        });
    };
    let timeOut = window.setTimeout(scan, 500);

    return () => {
      cleanupCamera();
      clearTimeout(timeOut);
    };
  }, [scanner, onScanStable]);

  return {
    /** Attach this ref to an {@link HTMLVideoElement} */
    ref: videoRef,
    scanner,
  };
}

/**
 * @returns cleanup function
 */
function attachCameraStream(video: HTMLVideoElement) {
  let cleanedUp = false;

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" }, audio: false })
    .then((stream) => {
      if (!cleanedUp) return;

      video.srcObject = stream;
      if (video.paused) {
        return video.play();
      }
    })
    .catch(
      logToastError(
        "Coludn't start the scanner.\nMake sure camera access is granted and reload the page.",
        { id: "scanner start error" },
      ),
    );

  return () => {
    cleanedUp = true;
    video.srcObject = null;
  };
}
