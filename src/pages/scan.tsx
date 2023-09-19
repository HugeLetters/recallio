import { CommondHeader } from "@/components/Header";
import ImageInput from "@/components/ImageInput";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import useHeader from "@/hooks/useHeader";
import { clamp } from "@/utils";
import { useDrag } from "@use-gesture/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ScannerPage() {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const { id, ready, start, stop, scanFile } = useBarcodeScanner((val) => goToReview(val));

  function goToReview(id: string) {
    void router.push({ pathname: "/review/[id]", query: { id } });
  }

  useEffect(() => {
    if (!ready) return (): void => void 0;
    // start().catch(console.error);

    return stop;
    // it should run only once on mount once scanner gave a signal it's ready to go
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useHeader(() => <CommondHeader title="Scanner" />, []);

  const [selection, setSelection] = useState(0);
  const [offset, setOffset] = useState(0);
  const bind = useDrag(
    ({ movement: [x], down }) => {
      setOffset(down ? x : 0);
      if (down) return;

      const step = Math.abs(x) > 100 ? 2 : Math.abs(x) > 30 ? 1 : 0;
      const direction = x < 0 ? 1 : -1;
      setSelection((x) => clamp(-1, x + step * direction, 1));
    },
    { axis: "x", filterTaps: true }
  );

  const transform = `translateX(calc(${offset}px ${selection > 0 ? "-" : "+"} ${
    !selection ? 0 : 100 / 3
  }%))`;
  return (
    <div
      className="relative flex h-full w-full touch-none justify-center overflow-x-hidden"
      {...bind()}
    >
      <div
        id={id}
        className="flex h-full justify-center [&>video]:!w-auto [&>video]:max-w-none"
      />
      <form
        className={`absolute bottom-5 grid grid-cols-3 pb-4 text-white drop-shadow-md duration-150 ease-in-out`}
        onSubmit={(e) => {
          e.preventDefault();
        }}
        style={{
          transform,
          transitionProperty: !offset ? "transform" : "none",
        }}
      >
        <button className="mx-1 rounded-xl bg-green-500 p-2">Upload</button>
        <button className="mx-1 rounded-xl bg-green-500 p-2">Scan</button>
        <button className="mx-1 rounded-xl bg-green-500 p-2">Input</button>
        {false && (
          <>
            <ImageInput
              className="flex cursor-pointer items-center justify-center rounded-l-xl bg-green-500 text-white focus-within:outline"
              aria-label="Scan from file"
              isImageSet={true}
              onChange={(e) => {
                const image = e.target.files?.item(0);
                if (!image || !ready) return;

                stop()
                  .then(() => {
                    scanFile(image)
                      .then((result) => {
                        goToReview(result.decodedText);
                      })
                      .catch((e) => {
                        start().catch(console.error);
                        console.error(e);
                      });
                  })
                  .catch(console.error);
              }}
            >
              Upload
            </ImageInput>
            <input
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="barcode"
              className="col-span-3 border border-green-500 p-3"
            />
            <button
              onClick={() => goToReview(barcode)}
              disabled={!barcode}
              className="rounded-r-xl bg-green-500 p-3 text-white"
            >
              Submit
            </button>
          </>
        )}
      </form>
    </div>
  );
}
