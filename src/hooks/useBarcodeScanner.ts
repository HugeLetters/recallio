import { Html5Qrcode, Html5QrcodeScannerState, type QrcodeSuccessCallback } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "react-toastify";

type Scanner = Html5Qrcode;
type ScannerState = "not mounted" | "stopped" | "scanning" | "starting";
export default function useBarcodeScanner(onScan: QrcodeSuccessCallback) {
  const id = useId();
  const [state, setState] = useState<ScannerState>("not mounted");
  const scanner = useRef<Scanner>();
  useEffect(() => {
    scanner.current = createScanner(id);
    setState("stopped");

    return () => {
      if (scanner.current) {
        stop(scanner.current).catch(console.error);
      }
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
    await stop(scanner);

    scanner
      .start({ facingMode: "environment" }, { fps: 5, aspectRatio: 1 }, onScan, () => void 0)
      .then(() => setState("scanning"))
      .catch((e) => {
        console.error(e);
        setState("stopped");
        toast.error("There was an error trying to start the scanner.");
      });
  }

  async function stop(scanner: Scanner, updateState?: boolean) {
    if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      await scanner
        .stop()
        .then(() => updateState && setState("stopped"))
        .catch(console.error);
    }
  }

  return {
    ready: true as const,
    state,
    id,
    start,
    stop: () => stop(getScanner(), true),
  };
}

function createScanner(id: string) {
  return new Html5Qrcode(id, {
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });
}
