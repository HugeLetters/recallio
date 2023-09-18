import { Html5Qrcode, Html5QrcodeScannerState, type QrcodeSuccessCallback } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "react-toastify";

type Scanner = Html5Qrcode;
type ScannerState = "not mounted" | "stopped" | "scanning" | "starting";
/**
 * Scanner cleans-up on being unmounted automatically.
 */
export default function useBarcodeScanner(onScan: QrcodeSuccessCallback) {
  const id = useId();
  const [state, setState] = useState<ScannerState>("not mounted");
  const scanner = useRef<Scanner>();
  useEffect(() => {
    scanner.current = createScanner(id);
    setState("stopped");

    return () => {
      stop().catch(console.error);
      scanner.current = undefined;
      setState("not mounted");
    };
  }, [id]);

  if (state === "not mounted") return { ready: false as const, state, id };

  function getScanner() {
    scanner.current ??= createScanner(id);
    return scanner.current;
  }

  async function start() {
    if (state === "starting") return;
    setState("starting");

    const scanner = getScanner();
    await stop();

    scanner
      .start({ facingMode: "environment" }, { fps: 30 }, onScan, () => void 0)
      .then(() => setState("scanning"))
      .catch((e) => {
        console.error(e);
        setState("stopped");
        toast.error("There was an error trying to start the scanner.");
      });
  }

  async function stop(updateState?: boolean) {
    if (!scanner.current) return;
    if (scanner.current.getState() === Html5QrcodeScannerState.SCANNING) {
      return scanner.current
        .stop()
        .then(() => updateState && setState("stopped"))
        .catch(console.error);
    }
  }

  return {
    ready: true as const,
    state,
    id,
    /** Does not have referential equality on rerenders */
    start,
    /** Does not have referential equality on rerenders */
    stop: () => stop(true),
    scanFile: (image: File) => getScanner().scanFileV2(image, false),
  };
}

function createScanner(id: string) {
  return new Html5Qrcode(id, {
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });
}
