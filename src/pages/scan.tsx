import { Layout, scanTypeAtom, scanTypeOffsetPercentageAtom } from "@/components/Layout";
import { logToastError, toast } from "@/components/Toast";
import { ImageInput } from "@/components/UI";
import { useSwipe } from "@/hooks";
import { tw } from "@/utils";
import type { NextPageWithLayout } from "@/utils/type";
import { Html5Qrcode, Html5QrcodeScannerState, type QrcodeSuccessCallback } from "html5-qrcode";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/router";
import { useEffect, useId, useRef, useState } from "react";
import SearchIcon from "~icons/iconamoon/search";

const Page: NextPageWithLayout = function () {
  const [scanType, dispatchScanType] = useAtom(scanTypeAtom);
  // reset scan type when leaving page
  useEffect(() => {
    return () => dispatchScanType("scan");
  }, [dispatchScanType]);

  const { id, ready, start, scanFile } = useBarcodeScanner(goToReview);
  function startScanner() {
    if (!ready) return;
    start().catch(
      logToastError(
        "Coludn't start the scanner.\nMake sure camera access is granted and reload the page.",
      ),
    );
  }
  // start scanner on page mount
  useEffect(() => {
    startScanner();
    // it should run only once on mount once scanner gave a signal it's ready to go
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const router = useRouter();
  function goToReview(id: string) {
    router.push({ pathname: "/review/[id]", query: { id } }).catch(console.error);
  }
  function scanImage(image: File) {
    if (!ready) return;
    scanFile(image)
      .then((result) => goToReview(result.decodedText))
      .catch((e) => {
        startScanner();
        toast.error("Couldn't detect barcode");
        console.error(e);
      });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggedDivRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useSwipe(draggedDivRef, {
    onSwipe({ dx }) {
      setOffset(dx);
    },
    onSwipeEnd({ dx }) {
      setOffset(0);
      if (Math.abs(dx) < 30) return;
      const delta = Math.abs(dx) < 90 ? 1 : 2;
      const move = (dx < 0 ? 1 : -1) * delta;
      dispatchScanType({
        move,
        onUpdate(value) {
          fileInputRef.current?.click();
          if (value !== "upload") return;
        },
      });
    },
  });

  const baseOffset = useAtomValue(scanTypeOffsetPercentageAtom);
  const translate = `clamp(-100%, calc(${offset}px - ${baseOffset}%), 100%)`;
  return (
    <div
      ref={draggedDivRef}
      className="relative isolate flex size-full touch-pan-y touch-pinch-zoom flex-col items-center justify-end gap-6 overflow-x-hidden px-10"
    >
      <div
        id={id}
        className="!absolute -z-10 flex size-full justify-center [&>video]:!w-auto [&>video]:max-w-none [&>video]:!flex-shrink-0"
      />
      {scanType === "input" && <BarcodeInput goToReview={goToReview} />}
      {/* todo - transform performance. Test if it performs better with  regular cam view instead of a scanner */}
      <div
        style={{ "--translate": translate }}
        className={tw(
          "relative mb-8 translate-x-[var(--translate)] text-white",
          !offset && "transition-transform",
        )}
      >
        <div
          className={tw(
            "absolute inset-0 z-10 grid -translate-x-[var(--translate)] grid-cols-3 *:mx-1",
            !offset && "transition-transform",
          )}
        >
          <div className="col-start-2 rounded-xl bg-app-green-500" />
        </div>
        <div className="relative z-20 grid grid-cols-3 *:mx-1">
          <ImageInput
            ref={fileInputRef}
            className={tw(
              "rounded-xl p-2 outline-none ring-black/50 ring-offset-2 transition-shadow focus-visible-within:ring-2",
            )}
            aria-label="Scan from file"
            isImageSet={true}
            onChange={(e) => {
              const image = e.target.files?.item(0);
              if (!image) return;
              scanImage(image);
            }}
            onClick={() => dispatchScanType("upload")}
          >
            Upload
          </ImageInput>
          <button
            className={tw(
              "rounded-xl p-2 outline-none ring-black/50 ring-offset-2 transition-shadow focus-visible-within:ring-2",
            )}
            onClick={() => dispatchScanType("scan")}
            type="button"
          >
            Scan
          </button>
          <button
            className={tw(
              "rounded-xl p-2 outline-none ring-black/50 ring-offset-2 transition-shadow focus-visible-within:ring-2",
            )}
            onClick={() => dispatchScanType("input")}
            type="button"
          >
            Input
          </button>
        </div>
        <div className="absolute inset-0 grid grid-cols-3 items-stretch *:mx-1">
          <div className="rounded-xl bg-black/50" />
          <div className="rounded-xl bg-black/50" />
          <div className="rounded-xl bg-black/50" />
        </div>
      </div>
    </div>
  );
};

// todo - polymorhic component attempt 3

Page.getLayout = function useLayout(page) {
  return <Layout header={{ title: "Scanner" }}>{page}</Layout>;
};

export default Page;

type BarcodeInputProps = { goToReview: (barcode: string) => void };
function BarcodeInput({ goToReview }: BarcodeInputProps) {
  return (
    <form
      className="flex w-full rounded-xl bg-white p-3 outline outline-2 outline-app-green-500 focus-within:outline-4"
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
        minLength={5}
        autoComplete="off"
      />
      <button
        aria-label="Open review page of the specified barcode"
        className="text-app-green-500"
      >
        <SearchIcon className="size-7" />
      </button>
    </form>
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
      .start({ facingMode: "environment" }, { fps: 15 }, onScan, undefined)
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
  return new Html5Qrcode(id, {
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });
}
