import { env } from "@/env.mjs";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ScannerPage() {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const { id, ready, start, stop } = useBarcodeScanner((val) => goToProduct(val), {
    mockScan: env.NEXT_PUBLIC_NODE_ENV === "development",
  });

  function goToProduct(id: string) {
    void router.push({ pathname: "/product/search/[id]", query: { id } });
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
      <div className="text-black">
        <input onChange={(e) => setBarcode(e.currentTarget.value)} />
        <button onClick={() => goToProduct(barcode)}>Submit</button>
      </div>
    </div>
  );
}
