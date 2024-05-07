import { createElasticStretchFunction } from "@/animation/elastic";
import { useSwipe } from "@/browser/swipe";
import { logToastError, toast } from "@/interface/toast";
import { ImagePicker } from "@/image/image-picker";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { getQueryParam, setQueryParam } from "@/navigation/query";
import { BARCODE_LENGTH_MAX, BARCODE_LENGTH_MIN } from "@/product/validation";
import type { BarcodeScanResult } from "@/scan";
import { scanFile, scanFromUrl } from "@/scan";
import { useBarcodeScanner } from "@/scan/hook";
import type { ScanType } from "@/scan/store";
import { scanTypeOffsetStore, scanTypeStore } from "@/scan/store";
import { useStore } from "@/state/store";
import { tw } from "@/styles/tw";
import { consumeShareTarget } from "@/sw/share/db";
import { SHARE_TARGET_ERROR_PARAM, SHARE_TARGET_PARAM } from "@/sw/share/url";
import { Slot } from "@radix-ui/react-slot";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import type { PropsWithChildren, RefObject } from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import SearchIcon from "~icons/iconamoon/search";
import Head from "next/head";

const Page: NextPageWithLayout = function () {
  const router = useRouter();
  const goToReview = createGoToReview(router);
  const goToReviewFromResult = createGoToReviewFromResult(router);

  const { ref } = useBarcodeScanner({ onScan: goToReviewFromResult });
  function scanImage(image: File) {
    scanFile(image).then(goToReviewFromResult).catch(logToastError("Couldn't detect barcode"));
  }

  useEffect(() => {
    if (!router.isReady) return;

    const isShareTarget = getQueryParam(router.query[SHARE_TARGET_PARAM]) !== undefined;
    const didShareTargetError = getQueryParam(router.query[SHARE_TARGET_ERROR_PARAM]) !== undefined;
    const shareTarget = consumeShareTarget();
    if (!isShareTarget) return;

    function handleError(message: string) {
      toast.error(message);
      setQueryParam({ key: SHARE_TARGET_PARAM, router });
      setQueryParam({ key: SHARE_TARGET_ERROR_PARAM, router });
    }

    if (didShareTargetError) {
      handleError("Invalid image was attached");
      return;
    }

    shareTarget
      .then((url) => {
        if (!url) {
          handleError("No image was attached");
          return;
        }

        scanFromUrl(url)
          .then(createGoToReviewFromResult(router))
          .catch((e) => {
            console.error(e);
            handleError("Couldn't detect barcode");
          });
      })
      .catch((e) => {
        console.error(e);
        handleError("Unexpected while handling shared image");
      });
  }, [router]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSwiped, setIsSwiped] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const barcodeInputRef = useRef<HTMLFormElement>(null);
  const swipeHandler = useScanTypeSwipe({
    target: controlsRef,
    ignore: barcodeInputRef,
    onScanTypeChange(scanType) {
      if (scanType !== "upload") return;
      fileInputRef.current?.click();
    },
    onSwipeStateChange(isSwiped) {
      if (isSwiped) {
        setIsSwiped(true);
      } else {
        // flush sync is required because any reflows at this stage(like losing focus on <BarcodeInput/>) will screw up the animation
        flushSync(() => {
          setIsSwiped(false);
        });
      }
    },
  });

  const scanType = useStore(scanTypeStore);
  const baseOffset = useStore(scanTypeOffsetStore);
  // reset scan type when leaving page
  useEffect(() => {
    return () => scanTypeStore.reset();
  }, []);

  const buttonBg = <div className="rounded-xl bg-black/60" />;
  return (
    <div
      onPointerDown={swipeHandler}
      className="relative isolate flex w-full touch-pan-y touch-pinch-zoom flex-col items-center justify-end gap-6 overflow-x-hidden"
    >
      <video
        ref={ref}
        inert={"true" as never as true}
        className="absolute inset-0 -z-10 size-full object-cover"
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
                e.target.value = "";
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
          {buttonBg}
          {buttonBg}
          {buttonBg}
        </ScanGrid>
      </div>
    </div>
  );
};

Page.getLayout = (children) => {
  return (
    <Layout
      header={{ title: "Scanner" }}
      full
    >
      <Head>
        <title>scan</title>
      </Head>
      {children}
    </Layout>
  );
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
          minLength={BARCODE_LENGTH_MIN}
          maxLength={BARCODE_LENGTH_MAX}
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

const baseSwipeData = { elastic: (x: number) => x, width: 0 };
type UseScanTypeSwipeOptions = {
  target: RefObject<HTMLElement>;
  ignore?: RefObject<HTMLElement>;
  onScanTypeChange?: (scanType: ScanType) => void;
  onSwipeStateChange?: (isSwiping: boolean) => void;
};
function useScanTypeSwipe({
  target,
  ignore,
  onScanTypeChange,
  onSwipeStateChange,
}: UseScanTypeSwipeOptions) {
  const baseOffset = useStore(scanTypeOffsetStore);
  const swipeDataRef = useRef(baseSwipeData);

  return useSwipe({
    ignore,
    onSwipe({ movement: { dx } }) {
      const targetEl = target.current;
      if (!targetEl) return;

      const { elastic, width } = swipeDataRef.current;
      const offset = width * baseOffset;
      const absoluteDx = dx - offset;
      const elasticDx = absoluteDx >= 0 ? elastic(absoluteDx) : -elastic(-absoluteDx);
      targetEl.style.setProperty("--offset", `${(elasticDx + offset).toFixed(2)}px`);
    },
    onSwipeStart() {
      onSwipeStateChange?.(true);
      const targetEl = target.current;
      if (!targetEl) return;

      const width = targetEl.clientWidth;
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
      onSwipeStateChange?.(false);
      if (Math.abs(dx) < 35) return;
      const delta = Math.abs(dx) < 110 ? 1 : 2;
      const move = (dx < 0 ? 1 : -1) * delta;

      const oldScanType = scanTypeStore.getSnapshot();
      scanTypeStore.move(move);
      const newScanType = scanTypeStore.getSnapshot();
      if (newScanType !== oldScanType) {
        onScanTypeChange?.(newScanType);
      }
      target.current?.style.removeProperty("--offset");
    },
  });
}

function createGoToReview(router: NextRouter) {
  return function (id: string) {
    router.push({ pathname: "/review/[id]", query: { id } }).catch(console.error);
  };
}

function createGoToReviewFromResult(router: NextRouter) {
  const goToReview = createGoToReview(router);
  return function (result: BarcodeScanResult) {
    return goToReview(result.getText());
  };
}
