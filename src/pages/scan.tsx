import { CommondHeader } from "@/components/Header";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import useHeader from "@/hooks/useHeader";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ScannerPage() {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const { id, ready, start, stop } = useBarcodeScanner((val) => goToReview(val));

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
    <div className="h-full w-full">
      <div
        id={id}
        className="flex h-full justify-center overflow-x-hidden [&>video]:!w-auto [&>video]:max-w-none"
      />
      <form
        className="text-black"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <input onChange={(e) => setBarcode(e.target.value)} />
        <button
          onClick={() => goToReview(barcode)}
          disabled={!barcode}
        >
          Submit
        </button>
      </form>
    </div>
  );
}
