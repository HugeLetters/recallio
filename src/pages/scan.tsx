import { Layout } from "@/components/Layout";
import { ImageInput } from "@/components/UI";
import { indexOf } from "@/utils";
import { useDrag } from "@use-gesture/react";
import { Html5Qrcode, Html5QrcodeScannerState, type QrcodeSuccessCallback } from "html5-qrcode";
import { useRouter } from "next/router";
import { useEffect, useId, useReducer, useRef, useState } from "react";
import { toast } from "react-toastify";
import LucidePen from "~icons/custom/pen";
import UploadIcon from "~icons/custom/photo-upload";
import ScanIcon from "~icons/custom/scan";
import SearchIcon from "~icons/iconamoon/search";

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selection, dispatchSelection] = useReducer(selectionReducer, "scan");
  useEffect(() => {
    if (selection !== "upload") return;
    fileInputRef.current?.click();
  }, [selection]);

  const [barcode, setBarcode] = useState("");
  const { id, ready, start, stop, scanFile } = useBarcodeScanner((val) => goToReview(val));
  useEffect(() => {
    if (!ready) return;
    start().catch(console.error);

    return () => {
      stop().catch(console.error);
    };
    // it should run only once on mount once scanner gave a signal it's ready to go
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const router = useRouter();
  function goToReview(id: string) {
    void router.push({ pathname: "/review/[id]", query: { id } });
  }

  function handleImage(image: File) {
    if (!ready) return;

    scanFile(image)
      .then((result) => {
        goToReview(result.decodedText);
      })
      .catch((e) => {
        start().catch(console.error);
        console.error(e);
      });
  }

  const [offset, setOffset] = useState(0);
  const transform = `translateX(calc(${offset}px ${selection !== "upload" ? "-" : "+"} ${
    selection === "scan" ? 0 : 100 / 3
  }%))`;
  const drag = useDrag(
    ({ movement: [x], down }) => {
      setOffset(down ? x : 0);
      if (down) return;
      if (Math.abs(x) < 30) return;
      const isNext = x < 0 ? true : false;
      dispatchSelection(isNext ? "next" : "prev");

      if (Math.abs(x) < 90) return;
      dispatchSelection(isNext ? "next" : "prev");
    },
    { axis: "x", filterTaps: true }
  );

  return (
    <Layout
      header={{ title: "Scanner" }}
      footer={{ Icon: getFooterIcon(selection) }}
    >
      <form
        className="relative isolate flex h-full w-full touch-pan-y touch-pinch-zoom flex-col items-center justify-end gap-6 overflow-x-hidden px-10"
        onSubmit={(e) => e.preventDefault()}
        {...drag()}
      >
        <div
          id={id}
          className="!absolute -z-10 flex h-full w-full justify-center [&>video]:!w-auto [&>video]:max-w-none"
        />
        {selection === "input" && (
          <label className="flex w-full rounded-xl bg-white p-3 outline outline-2 outline-app-green focus-within:outline-4">
            <input
              className="grow outline-none"
              placeholder="barcode"
              autoFocus
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button
              aria-label="open review page of the specified barcode"
              role="navigation"
              disabled={!barcode}
              className="text-app-green"
              onClick={() => goToReview(barcode)}
            >
              <SearchIcon className="h-7 w-7" />
            </button>
          </label>
        )}
        <div
          className={`grid grid-cols-3 pb-8 text-white ${!offset ? "transition-transform" : ""}`}
          style={{ transform }}
        >
          <ImageInput
            ref={fileInputRef}
            className={`mx-1 cursor-pointer rounded-xl p-2 transition-colors duration-300 ${
              selection === "upload" ? "bg-app-green" : "bg-black/50"
            }`}
            aria-label="Scan from file"
            isImageSet={true}
            onChange={(e) => {
              const image = e.target.files?.item(0);
              if (!image) return;
              handleImage(image);
            }}
            onClick={() => dispatchSelection("upload")}
          >
            Upload
          </ImageInput>
          <button
            className={`mx-1 rounded-xl p-2 transition-colors duration-300 ${
              selection === "scan" ? "bg-app-green" : "bg-black/50"
            }`}
            onClick={() => dispatchSelection("scan")}
            type="button"
          >
            Scan
          </button>
          <button
            className={`mx-1 rounded-xl p-2 transition-colors duration-300 ${
              selection === "input" ? "bg-app-green" : "bg-black/50"
            }`}
            onClick={() => dispatchSelection("input")}
            type="button"
          >
            Input
          </button>
        </div>
      </form>
    </Layout>
  );
}

type Scanner = Html5Qrcode;
type ScannerState = "not mounted" | "stopped" | "scanning" | "starting";
/**
 * Scanner cleans-up on being unmounted automatically.
 */
function useBarcodeScanner(onScan: QrcodeSuccessCallback) {
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

  if (state === "not mounted" || !scanner.current) return { ready: false as const, state, id };

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
      .start({ facingMode: "environment" }, { fps: 15 }, onScan, () => void 0)
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
    /** Stops the scanner before reading the file */
    scanFile: async (image: File) => {
      await stop(true);
      return getScanner().scanFileV2(image, false);
    },
  };
}

function createScanner(id: string) {
  return new Html5Qrcode(id, {
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });
}

function getFooterIcon(selection: Selection) {
  switch (selection) {
    case "upload":
      return UploadIcon;
    case "input":
      return LucidePen;
    case "scan":
      return ScanIcon;
    default:
      const x: never = selection;
      return x;
  }
}

const selection = ["upload", "scan", "input"] as const;
type Selection = (typeof selection)[number];
type SelectionEvent = Selection | "next" | "prev";
function selectionReducer(state: Selection, payload: SelectionEvent) {
  switch (payload) {
    case "upload":
    case "scan":
    case "input":
      return payload;
    case "next":
      return selection[(indexOf(selection, state) ?? selection.length) + 1] ?? selection[2];
    case "prev":
      return selection[(indexOf(selection, state) ?? 0) - 1] ?? selection[0];
    default: {
      const x: never = payload;
      return x;
    }
  }
}
