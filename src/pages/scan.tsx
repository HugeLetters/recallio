import useBarcodeScanner from "@/hooks/useBarcodeScanner";
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

  return (
    <div>
      <div
        id={id}
        className="w-56 "
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
