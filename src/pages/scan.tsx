import { Layout, selectionAtom } from "@/components/Layout";
import { ImageInput } from "@/components/UI";
import type { NextPageWithLayout } from "@/utils/type";
import { useDrag } from "@use-gesture/react";
import { Html5Qrcode, Html5QrcodeScannerState, type QrcodeSuccessCallback } from "html5-qrcode";
import { useAtom } from "jotai";
import { useRouter } from "next/router";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "react-toastify";

import SearchIcon from "~icons/iconamoon/search";

const Page: NextPageWithLayout = function () {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selection, dispatchSelection] = useAtom(selectionAtom);
  useEffect(() => {
    if (selection !== "upload") return;
    fileInputRef.current?.click();
  }, [selection]);
  useEffect(() => {
    return function () {
      dispatchSelection("scan");
    };
  }, [dispatchSelection]);

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
    { axis: "x", filterTaps: true },
  );

  return (
    <div
      className="relative isolate flex size-full touch-pan-y touch-pinch-zoom flex-col items-center justify-end gap-6 overflow-x-hidden px-10"
      {...drag()}
    >
      <div
        id={id}
        className="!absolute -z-10 flex size-full justify-center [&>video]:!w-auto [&>video]:max-w-none [&>video]:!flex-shrink-0"
      />
      {selection === "input" && (
        <form
          className="flex w-full rounded-xl bg-white p-3 outline outline-2 outline-app-green focus-within:outline-4"
          onSubmit={(e) => {
            e.preventDefault();
            const barcode = String(new FormData(e.currentTarget).get("barcode"));
            goToReview(barcode);
          }}
        >
          <input
            className="grow outline-none"
            placeholder="barcode"
            name="barcode"
            autoFocus
            required
            autoComplete="off"
          />
          <button
            aria-label="Open review page of the specified barcode"
            className="text-app-green"
          >
            <SearchIcon className="size-7" />
          </button>
        </form>
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
    </div>
  );
};

Page.getLayout = function useLayout(page) {
  return <Layout header={{ title: "Scanner" }}>{page}</Layout>;
};

export default Page;

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
