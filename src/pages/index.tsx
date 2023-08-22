import Auth from "@/components/auth";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import { api } from "@/utils/api";
import Head from "next/head";
import { useState } from "react";

export default function Home() {
  const [scanResult, setScanResult] = useState("QR scan result");
  const scanner = useBarcodeScanner(handleScan);
  const { data: products } = api.product.getProducts.useQuery(scanResult, {
    enabled: scanResult !== "QR scan result",
  });

  function handleScan(scanData: typeof scanResult) {
    setScanResult(scanData);
    if (scanner.ready) {
      void scanner.stop();
    }
  }

  return (
    <>
      <Head>
        <title>recallio</title>
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <button
            className="rounded-full bg-purple-700 p-4 text-lime-300 outline outline-1 outline-lime-300 transition-[filter] disabled:saturate-0"
            onClick={() => {
              if (scanner.state === "not mounted") return;
              scanner.state === "scanning" ? void scanner.stop() : void scanner.start();
            }}
            disabled={!scanner.ready || scanner.state === "starting"}
          >
            {scanner.state !== "scanning" ? "START SCAN" : "STOP SCAN"}
          </button>
          <div
            id={scanner.id}
            className="aspect-square h-56 overflow-hidden rounded-3xl bg-purple-900 object-cover shadow-[0_0_40px_3px] shadow-purple-300 transition-shadow duration-500"
          />
          <div>{scanResult}</div>
          <div>{scanner.state}</div>
        </div>
        {products && (
          <div className="bg-yellow-400 p-4">
            {products.map((product) => (
              <div key={product}>{product}</div>
            ))}
          </div>
        )}
        <Auth />
      </main>
    </>
  );
}
