import { createElasticStretchFunction } from "@/animation/elastic";
import { useSwipe } from "@/browser/swipe";
import { logToastError, toast } from "@/components/toast";
import { ImagePicker } from "@/image/image-picker";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { scanTypeOffsetStore, scanTypeStore } from "@/layout/footer";
import { barcodeLengthMax, barcodeLengthMin } from "@/product/validation";
import { useStore } from "@/state/store";
import { tw } from "@/styles/tw";
import { Slot } from "@radix-ui/react-slot";
import type { QrcodeSuccessCallback } from "html5-qrcode";
import { Html5QrcodeScannerState, Html5Qrcode as Scanner } from "html5-qrcode";
import { useRouter } from "next/router";
import type { PropsWithChildren } from "react";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import SearchIcon from "~icons/iconamoon/search";

const baseSwipeData = { elastic: (x: number) => x, width: 0 };

const Page: NextPageWithLayout = function () {
  // reset scan type when leaving page
  useEffect(() => {
    return () => scanTypeStore.reset();
  }, []);

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

  const scanType = useStore(scanTypeStore);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseOffset = useStore(scanTypeOffsetStore);
  const [isSwiped, setIsSwiped] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const swipeDataRef = useRef(baseSwipeData);
  const barcodeInputRef = useRef<HTMLFormElement>(null);
  const swipeHandler = useSwipe({
    ignore: barcodeInputRef,
    onSwipe({ movement: { dx } }) {
      const controls = controlsRef.current;
      if (!controls) return;

      const { elastic, width } = swipeDataRef.current;
      const offset = width * baseOffset;
      const absoluteDx = dx - offset;
      const elasticDx = absoluteDx >= 0 ? elastic(absoluteDx) : -elastic(-absoluteDx);
      controls.style.setProperty("--offset", `${(elasticDx + offset).toFixed(2)}px`);
    },
    onSwipeStart() {
      setIsSwiped(true);

      const controls = controlsRef.current;
      if (!controls) return;

      const width = controls.clientWidth;
      const half = width / 2;
      swipeDataRef.current = {
        elastic: createElasticStretchFunction({
          cutoff: half,
          coefficient: 1,
          stretch: 50,
        }),
        width,
      };
    },
    onSwipeEnd({ movement: { dx } }) {
      // flush sync is required before .removeProperty because any reflows at this stage(like losing focus on <BarcodeInput/>) will screw up the animation
      flushSync(() => {
        setIsSwiped(false);
        if (Math.abs(dx) < 35) return;
        const delta = Math.abs(dx) < 110 ? 1 : 2;
        const move = (dx < 0 ? 1 : -1) * delta;
        const oldScanType = scanType;
        scanTypeStore.move(move);
        const newScanType = scanTypeStore.getSnapshot();
        if (newScanType !== "upload" || oldScanType === "upload") return;
        fileInputRef.current?.click();
      });
      controlsRef.current?.style.removeProperty("--offset");
    },
  });

  return (
    <div
      onPointerDown={swipeHandler}
      className="relative isolate flex w-full touch-pan-y touch-pinch-zoom flex-col items-center justify-end gap-6 overflow-x-hidden"
    >
      <div
        id={id}
        ref={(node) => {
          if (!node) return;
          // removes video interactions in firefox
          node.inert = true;
        }}
        // dont remove braces - w/o them ast-grep parses this file incorrectly
        className={"!absolute inset-0 -z-10 [&>video]:!size-full [&>video]:object-cover"}
      />
      {scanType === "input" && (
        <BarcodeInput
          ref={barcodeInputRef}
          goToReview={goToReview}
        />
      )}
      <div
        ref={controlsRef}
        style={{ "--translate": `calc(var(--offset, 0px) - 100% * ${baseOffset})` }}
        className={tw(
          "relative mb-8 translate-x-[var(--translate)] text-white",
          !isSwiped && "transition-transform",
        )}
      >
        <ScanGrid
          className={tw(
            "absolute inset-0 z-10 -translate-x-[var(--translate)]",
            !isSwiped && "transition-transform",
          )}
        >
          <div className="col-start-2 rounded-xl bg-app-green-500" />
        </ScanGrid>
        <ScanGrid className="relative z-20">
          <ScanButton active={scanType === "upload"}>
            <ImagePicker
              ref={fileInputRef}
              aria-label="Scan from file"
              isImageSet={true}
              onChange={(e) => {
                const image = e.target.files?.item(0);
                if (!image) return;
                scanImage(image);
              }}
              onClick={() => scanTypeStore.select("upload")}
            >
              Upload
            </ImagePicker>
          </ScanButton>
          <ScanButton active={scanType === "scan"}>
            <button
              onClick={() => scanTypeStore.select("scan")}
              type="button"
            >
              Scan
            </button>
          </ScanButton>
          <ScanButton active={scanType === "input"}>
            <button
              onClick={() => scanTypeStore.select("input")}
              type="button"
              className=""
            >
              Input
            </button>
          </ScanButton>
        </ScanGrid>
        <ScanGrid className="absolute inset-0 items-stretch">
          <div className="rounded-xl bg-black/50" />
          <div className="rounded-xl bg-black/50" />
          <div className="rounded-xl bg-black/50" />
        </ScanGrid>
      </div>
    </div>
  );
};

Page.getLayout = (children) => {
  return <Layout header={{ title: "Scanner" }}>{children}</Layout>;
};

export default Page;

type ScanGrid2Props = { className?: string };
function ScanGrid({ children, className }: PropsWithChildren<ScanGrid2Props>) {
  return <div className={tw("grid grid-cols-3 *:mx-1", className)}>{children}</div>;
}

type ScanButtonProps = { active: boolean };
function ScanButton({ children, active }: PropsWithChildren<ScanButtonProps>) {
  return (
    <Slot
      className={tw(
        "shrink-0 rounded-xl p-2 outline-none ring-black/50 ring-offset-2 transition-shadow focus-visible-within:ring-2",
        active && "focus-visible-within:ring-app-green-500",
      )}
    >
      {children}
    </Slot>
  );
}

type BarcodeInputProps = { goToReview: (barcode: string) => void };
const BarcodeInput = forwardRef<HTMLFormElement, BarcodeInputProps>(function _(
  { goToReview },
  ref,
) {
  return (
    <form
      ref={ref}
      className="w-full px-10"
      onSubmit={(e) => {
        e.preventDefault();
        const barcode = String(new FormData(e.currentTarget).get("barcode"));
        goToReview(barcode);
      }}
    >
      <div className="flex rounded-xl bg-white p-3  outline outline-2 outline-app-green-500 focus-within:outline-4">
        <input
          className="min-w-0 grow outline-none"
          placeholder="barcode"
          name="barcode"
          autoFocus
          required
          minLength={barcodeLengthMin}
          maxLength={barcodeLengthMax}
          autoComplete="off"
        />
        <button
          aria-label="Open review page of the specified barcode"
          className="text-app-green-500"
        >
          <SearchIcon className="size-7" />
        </button>
      </div>
    </form>
  );
});

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
