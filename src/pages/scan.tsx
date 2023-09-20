import { CommondHeader } from "@/components/Header";
import ImageInput from "@/components/ImageInput";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import useHeader from "@/hooks/useHeader";
import { SelectList, type StrictPick } from "@/utils";
import { useDrag } from "@use-gesture/react";
import { useAtom } from "jotai";
import { atomWithReducer } from "jotai/utils";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import SearchIcon from "~icons/iconamoon/search.jsx";

export default function ScannerPage() {
  useHeader(() => <CommondHeader title="Scanner" />, []);

  const [selection, selectionDispatch] = useAtom(selectionAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploadSelected = selection === "upload";
  useEffect(() => {
    if (!isUploadSelected) return;
    fileInputRef.current?.click();
  }, [isUploadSelected]);

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
      selectionDispatch([isNext ? "next" : "previous"]);

      if (Math.abs(x) < 90) return;
      selectionDispatch([isNext ? "next" : "previous"]);
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
      {selection === "input" && (
        <div className="absolute bottom-24 left-1/2 w-full -translate-x-1/2 px-6">
          <label className="flex rounded-xl bg-white p-3 outline outline-1 outline-app-green focus-within:outline-4">
            <input
              className="grow outline-none"
              placeholder="barcode"
              autoFocus
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button
              onClick={() => goToReview(barcode)}
              disabled={!barcode}
              className="text-app-green"
            >
              <SearchIcon className="h-7 w-7" />
            </button>
          </label>
        </div>
      )}
      <div
        className={`absolute bottom-8 grid grid-cols-3 text-white ${
          !offset ? "transition-transform" : ""
        }`}
        style={{ transform }}
      >
        <ImageInput
          ref={fileInputRef}
          className={`mx-1 cursor-pointer rounded-xl p-2 transition-colors duration-300  ${
            selection === "upload" ? "bg-app-green" : "bg-black/50"
          }`}
          aria-label="Scan from file"
          isImageSet={true}
          onChange={(e) => {
            const image = e.target.files?.item(0);
            if (!image) return;
            handleImage(image);
          }}
          onClick={() => selectionDispatch(["set", "upload"])}
        >
          Upload
        </ImageInput>
        <button
          className={`mx-1 rounded-xl p-2 transition-colors duration-300 ${
            selection === "scan" ? "bg-app-green" : "bg-black/50"
          }`}
          onClick={() => selectionDispatch(["set", "scan"])}
          type="button"
        >
          Scan
        </button>
        <button
          className={`mx-1 rounded-xl p-2 transition-colors duration-300 ${
            selection === "input" ? "bg-app-green" : "bg-black/50"
          }`}
          onClick={() => selectionDispatch(["set", "input"])}
          type="button"
        >
          Input
        </button>
      </div>
    </form>
  );
}

const selection = new SelectList(["upload", "scan", "input"], "scan");
type SelectionAtomEvent =
  | [type: keyof StrictPick<typeof selection, "next" | "previous">, value?: never]
  | [type: keyof StrictPick<typeof selection, "set">, value: ReturnType<(typeof selection)["get"]>];
export const selectionAtom = atomWithReducer(
  selection.get(),
  (_, [type, value]: SelectionAtomEvent) => {
    if (type === "set") {
      return selection.set(value);
    } else {
      return selection[type]();
    }
  }
);
