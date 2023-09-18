import { CommondHeader } from "@/components/Header";
import ImageInput from "@/components/ImageInput";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import useHeader from "@/hooks/useHeader";
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
    start().catch(console.error);

    return stop;
    // it should run only once on mount once scanner gave a signal it's ready to go
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useHeader(() => <CommondHeader title="Scanner" />, []);

  return (
    <div className="relative flex h-full w-full justify-center">
      <div
        id={id}
        className="flex h-full justify-center overflow-x-hidden [&>video]:!w-auto [&>video]:max-w-none"
      />
      <form
        className="absolute bottom-5 grid grid-cols-5 p-4 text-black drop-shadow-md"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
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
      </form>
    </div>
  );
}
