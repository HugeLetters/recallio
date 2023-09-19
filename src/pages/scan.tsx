import { CommondHeader } from "@/components/Header";
import ImageInput from "@/components/ImageInput";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import useHeader from "@/hooks/useHeader";
import { clamp } from "@/utils";
import { useDrag } from "@use-gesture/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import SearchIcon from "~icons/iconamoon/search.jsx";

export default function ScannerPage() {
  useHeader(() => <CommondHeader title="Scanner" />, []);

  function useSelection() {
    const [selection, _setSelection] = useState(0);

    function setSelection(value: typeof selection) {
      value = clamp(-1, value, 1);
      if (selection === value) return;

      _setSelection(value);
      if (value < 0) fileInputRef.current?.click();
    }

    return [selection, setSelection] as const;
  }
  const [selection, setSelection] = useSelection();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { id, ready, start, stop, scanFile } = useBarcodeScanner((val) => goToReview(val));
  const [barcode, setBarcode] = useState("");

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

  useEffect(() => {
    if (!ready) return;
    start().catch(console.error);

    return () => {
      stop().catch(console.error);
    };
    // it should run only once on mount once scanner gave a signal it's ready to go
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const [offset, setOffset] = useState(0);
  const transform = `translateX(calc(${offset}px ${selection > 0 ? "-" : "+"} ${
    !selection ? 0 : 100 / 3
  }%))`;
  const bind = useDrag(
    ({ movement: [x], down }) => {
      setOffset(down ? x : 0);
      if (down) return;

      const step = Math.abs(x) > 90 ? 2 : Math.abs(x) > 30 ? 1 : 0;
      const direction = x < 0 ? 1 : -1;
      setSelection(selection + step * direction);
    },
    { axis: "x", filterTaps: true }
  );

  return (
    <form
      className="relative flex h-full w-full touch-pan-y touch-pinch-zoom justify-center overflow-x-hidden"
      onSubmit={(e) => e.preventDefault()}
      {...bind()}
    >
      <div
        id={id}
        className="flex h-full justify-center [&>video]:!w-auto [&>video]:max-w-none"
      />
      {selection > 0 && (
        <div className="absolute bottom-24 left-1/2 w-full -translate-x-1/2 px-6">
          <label className="flex rounded-xl bg-white p-3 outline outline-1 outline-green-500 focus-within:outline-4">
            <input
              className="grow outline-none"
              placeholder="barcode"
              autoFocus
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button
              onClick={() => goToReview(barcode)}
              disabled={!barcode}
              className="text-green-500"
            >
              <SearchIcon className="h-7 w-7" />
            </button>
          </label>
        </div>
      )}
      <div
        className={`absolute bottom-8 grid grid-cols-3 text-white drop-shadow-md ${
          !offset ? "transition-transform" : ""
        }`}
        style={{ transform }}
      >
        <ImageInput
          ref={fileInputRef}
          className="mx-1 cursor-pointer rounded-xl bg-green-500 p-2 "
          aria-label="Scan from file"
          isImageSet={true}
          onChange={(e) => {
            const image = e.target.files?.item(0);
            if (!image) return;
            handleImage(image);
          }}
          onClick={() => setSelection(-1)}
        >
          Upload
        </ImageInput>
        <button
          className="mx-1 rounded-xl bg-green-500 p-2"
          onClick={() => setSelection(0)}
          type="button"
        >
          Scan
        </button>
        <button
          className="mx-1 rounded-xl bg-green-500 p-2"
          onClick={() => setSelection(1)}
          type="button"
        >
          Input
        </button>
      </div>
    </form>
  );
}
