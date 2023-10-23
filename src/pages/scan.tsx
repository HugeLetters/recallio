import { ImageInput } from "@/components/UI";
import useHeader from "@/hooks/useHeader";
import { clamp } from "@/utils";
import { useDrag } from "@use-gesture/react";
import { Html5Qrcode, Html5QrcodeScannerState, type QrcodeSuccessCallback } from "html5-qrcode";
import { useAtom } from "jotai";
import { atomWithReducer } from "jotai/utils";
import { useRouter } from "next/router";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "react-toastify";
import SearchIcon from "~icons/iconamoon/search.jsx";

export default function Page() {
  useHeader(() => ({ title: "Scanner" }), []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  function clickUpload() {
    fileInputRef.current?.click();
  }
  const [selection, selectionDispatch] = useAtom(selectionAtom);
  useEffect(() => {
    return () => selectionDispatch({ action: "set", value: "scan" });
  }, [selectionDispatch]);

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
  const bind = useDrag(
    ({ movement: [x], down }) => {
      setOffset(down ? x : 0);
      if (down) return;

      if (Math.abs(x) < 30) return;
      const isNext = x < 0 ? true : false;
      selectionDispatch({ action: isNext ? "next" : "prev", activateUpload: clickUpload });

      if (Math.abs(x) < 90) return;
      selectionDispatch({ action: isNext ? "next" : "prev", activateUpload: clickUpload });
    },
    { axis: "x", filterTaps: true }
  );

  return (
    <form
      className="relative isolate flex h-full w-full touch-pan-y touch-pinch-zoom flex-col items-center justify-end gap-6 overflow-x-hidden px-10"
      onSubmit={(e) => e.preventDefault()}
      {...bind()}
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
          onClick={() => selectionDispatch({ action: "set", value: "upload" })}
        >
          Upload
        </ImageInput>
        <button
          className={`mx-1 rounded-xl p-2 transition-colors duration-300 ${
            selection === "scan" ? "bg-app-green" : "bg-black/50"
          }`}
          onClick={() => selectionDispatch({ action: "set", value: "scan" })}
          type="button"
        >
          Scan
        </button>
        <button
          className={`mx-1 rounded-xl p-2 transition-colors duration-300 ${
            selection === "input" ? "bg-app-green" : "bg-black/50"
          }`}
          onClick={() => selectionDispatch({ action: "set", value: "input" })}
          type="button"
        >
          Input
        </button>
      </div>
    </form>
  );
}
class SelectList<const T> {
  constructor(public values: [T, ...T[]], public value = values[0]) {}

  #clampIndex = (index: number) => clamp(0, index, this.values.length - 1);
  #getIndex(value: T) {
    const index = this.values.indexOf(value);
    if (index === -1) return null;
    return index;
  }

  prev(): T {
    const index = this.#getIndex(this.value) ?? 0;
    this.value = this.values[this.#clampIndex(index - 1)] ?? this.values[0];
    return this.value;
  }
  next(): T {
    const index = this.#getIndex(this.value) ?? this.values.length - 1;
    this.value = this.values[this.#clampIndex(index + 1)] ?? this.values.at(-1) ?? this.values[0];
    return this.value;
  }
  set(value: T): T {
    this.value = value;
    return this.value;
  }
}

const selection = new SelectList(["upload", "scan", "input"], "scan");
type SelectionAtomEvent =
  | { action: "next" | "prev"; activateUpload: () => void }
  | { action: "set"; value: typeof selection.value };
export const selectionAtom = atomWithReducer(
  selection.value,
  (prevValue, payload: SelectionAtomEvent) => {
    function getNewValue() {
      switch (payload.action) {
        case "next":
          return selection.next();
        case "prev":
          return selection.prev();
        case "set":
          return selection.set(payload.value);
        default:
          const x: never = payload;
          return x;
      }
    }
    const newValue = getNewValue();

    if (payload.action !== "set" && newValue === "upload" && newValue !== prevValue) {
      payload.activateUpload();
    }

    return newValue;
  }
);

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
