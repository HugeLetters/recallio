import { logToastError } from "@/components/toast";
import type { QrcodeSuccessCallback } from "html5-qrcode";
import { Html5QrcodeScannerState, Html5Qrcode as Scanner } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";

type ScannerState = "not mounted" | "stopped" | "scanning" | "starting";
/**
 * Scanner cleans-up on being unmounted automatically.
 */
export function useBarcodeScanner(onScan: QrcodeSuccessCallback) {
  const id = useId();
  const [state, setState] = useState<ScannerState>("not mounted");
  const scanner = useRef<Scanner>();

  useEffect(() => {
    scanner.current = createScanner(id);
    setState("stopped");

    return () => {
      stop().catch(
        logToastError("Failed to stop scanner.\nReloading the page is advised to avoid stutters."),
      );
      scanner.current = undefined;
      setState("not mounted");
    };
  }, [id]);

  if (state === "not mounted" || !scanner.current) {
    return {
      ready: false as const,
      state,
      /** Attach this id to element where camera feed should be projected to */
      id,
    };
  }

  function getScanner() {
    scanner.current ??= createScanner(id);
    return scanner.current;
  }

  async function start() {
    if (state === "starting") return;
    setState("starting");

    const scanner = getScanner();
    await stop();
    return scanner
      .start({ facingMode: "environment" }, { fps: 2 }, onScan, undefined)
      .then(() => setState("scanning"))
      .catch((e) => {
        setState("stopped");
        throw e;
      });
  }

  async function stop(updateState?: boolean) {
    if (scanner.current?.getState() !== Html5QrcodeScannerState.SCANNING) return;

    return scanner.current.stop().then(() => {
      if (!updateState) return;
      setState("stopped");
    });
  }

  return {
    ready: true as const,
    state,
    id,
    /** Does not have referential equality on rerenders */
    start,
    /** Does not have referential equality on rerenders */
    stop: () => stop(true),
    /** Stops the scanner before reading the file */
    scanFile: async (image: File) => {
      await stop(true);
      return getScanner().scanFileV2(image, false);
    },
  };
}

function createScanner(id: string) {
  return new Scanner(id, {
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });
}
