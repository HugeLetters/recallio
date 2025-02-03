import { createElasticStretchFunction } from "@/animation/elastic";
import { useSwipe } from "@/browser/gesture/swipe";
import { ImagePicker } from "@/image/image-picker";
import { logToastError, toast } from "@/interface/toast";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { logger } from "@/logger";
import { getQueryParam, setQueryParam } from "@/navigation/query";
import { BARCODE_LENGTH_MAX, BARCODE_LENGTH_MIN } from "@/product/validation";
import { useBarcodeScanner } from "@/scan/hook";
import type { ScanType } from "@/scan/store";
import { scanTypeOffsetStore, scanTypeStore } from "@/scan/store";
import { useStore } from "@/state/store";
import { tw } from "@/styles/tw";
import { consumeShareTarget } from "@/sw/share/db";
import { SHARE_TARGET_ERROR_PARAM, SHARE_TARGET_PARAM } from "@/sw/share/url";
import { Range, Root, Thumb, Track } from "@radix-ui/react-slider";
import { Slot } from "@radix-ui/react-slot";
import Head from "next/head";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import type { PropsWithChildren, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import SearchIcon from "~icons/iconamoon/search";

const Page: NextPageWithLayout = function () {
  const router = useRouter();
  const handleScan = createScanHandler(router);

  const { ref, scanner, changeZoom } = useBarcodeScanner({
    onScan: (barcode) => {
      if (!barcode) return;
      handleScan(barcode);
    },
  });
  function scanFile(image: File) {
    scanner?.scanBlob(image).then(handleScan).catch(logToastError("Couldn't detect barcode"));
  }

  useEffect(() => {
    if (!router.isReady || !scanner) return;

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

        scanner
          .scanUrl(url)
          .then(createScanHandler(router))
          .catch((e) => {
            console.error(e);
            handleError("Couldn't detect barcode");
          });
      })
      .catch((e) => {
        logger.error(e);
        handleError("Unexpected while handling shared image");
      });
  }, [scanner, router]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSwiped, setIsSwiped] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const extraMenuRef = useRef<HTMLDivElement>(null);
  const swipeHandler = useScanTypeSwipe({
    target: controlsRef,
    ignore: extraMenuRef,
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
        playsInline
        disablePictureInPicture
        inert={"true" as never as true}
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div
        className="w-full empty:hidden"
        ref={extraMenuRef}
      >
        {scanType === "input" && <BarcodeInput goToReview={handleScan} />}
        {scanType === "scan" && changeZoom && <ZoomSlider onChange={changeZoom} />}
      </div>
      <div
        ref={controlsRef}
        style={{ "--tx": `calc(var(--offset, 0px) - 100% * ${baseOffset})` }}
        className={tw(
          "relative mb-8 translate-x-[--tx] text-white",
          !isSwiped && "transition-transform",
        )}
      >
        <ScanGrid
          className={tw(
            "absolute inset-0 z-10 -translate-x-[--tx]",
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
                scanFile(image);
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

Page.isPublic = true;

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
        "shrink-0 rounded-xl p-2 outline-none ring-black/60 ring-offset-2 transition-shadow focus-visible-within:ring-2",
        active && "focus-visible-within:ring-app-green-500",
      )}
    >
      {children}
    </Slot>
  );
}

type BarcodeInputProps = { goToReview: (barcode: string) => void };
function BarcodeInput({ goToReview }: BarcodeInputProps) {
  return (
    <form
      className="px-10"
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
}

type ZoomSliderProps = { onChange: (value: number) => void };
function ZoomSlider({ onChange }: ZoomSliderProps) {
  return (
    <div className="mx-auto flex max-w-64 select-none items-baseline gap-1 rounded-lg bg-black/60 px-2 py-3">
      <span className="text-white">Zoom</span>
      <Root
        className="relative flex h-6 grow touch-none items-center"
        min={0}
        max={100}
        onValueChange={([value]) => {
          if (value === undefined) return;
          onChange(value);
        }}
      >
        <Track className="relative h-2 grow rounded-full bg-white after:absolute after:-inset-y-4 after:inset-x-0">
          <Range className="absolute h-full rounded-full bg-app-green-500" />
        </Track>
        <Thumb className="block size-5 rounded-full bg-white outline-app-green-500 shadow-around sa-o-20 sa-r-1" />
      </Root>
    </div>
  );
}

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
      target.current?.style.removeProperty("--offset");

      if (Math.abs(dx) < 35) return;
      const delta = Math.abs(dx) < 110 ? 1 : 2;
      const move = (dx < 0 ? 1 : -1) * delta;

      const oldScanType = scanTypeStore.getSnapshot();
      scanTypeStore.move(move);
      const newScanType = scanTypeStore.getSnapshot();
      if (newScanType !== oldScanType) {
        onScanTypeChange?.(newScanType);
      }
    },
  });
}

function createScanHandler(router: NextRouter) {
  return function (barcode: string | null) {
    if (barcode === null) {
      toast.error("No barcode detected");
      return;
    }
    router.push({ pathname: "/review/[id]", query: { id: barcode } }).catch(logger.error);
  };
}
