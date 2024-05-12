import { browser } from "@/browser";
import { logToastError } from "@/interface/toast";
import { useStableValue } from "@/state/stable";
import { isDev } from "@/utils";
import { useEffect, useRef, useState } from "react";
import { createBarcodeScanner } from "./scanner";

type UseBarcodeScannerOptions = { onScan: (result: string | null) => void };
export function useBarcodeScanner({ onScan }: UseBarcodeScannerOptions) {
  const [scanner] = useState(() => (browser ? createBarcodeScanner() : null));
  const onScanStable = useStableValue(onScan);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scanner) return;

    const cleanupCamera = attachCameraStream(video);
    const cancelLoop = timedLoop(
      () =>
        scanner
          .scanVideo(video)
          .then(onScanStable.current)
          .catch(
            logToastError("Unexpected error occured during scan", {
              id: "scanner unexpected error",
            }),
          ),
      500,
    );

    return () => {
      cleanupCamera();
      cancelLoop();
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

/**
 * @returns cancel function
 */
function timedLoop(task: () => Promise<unknown>, period: number) {
  const loop = function () {
    const start = performance.now();
    task().finally(() => {
      const untilNextLoop = Math.max(0, period + start - performance.now());
      if (isDev && untilNextLoop === 0) {
        console.warn(`Task took longer than ${period}ms`);
      }
      timeout = window.setTimeout(loop, untilNextLoop);
    });
  };

  let timeout = window.setTimeout(loop, period);
  return () => {
    clearTimeout(timeout);
  };
}
