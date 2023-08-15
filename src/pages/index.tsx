import { api } from "@/utils/api";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function Home() {
  const hello = api.example.hello.useQuery({ text: "from tRPC" });

  const camera = useRef<HTMLVideoElement>(null);
  function handleMedia() {
    if (!camera.current) return;

    if (camera.current.srcObject) {
      const a: number = "da";
      camera.current.srcObject = null;
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (!camera.current) return;
        camera.current.srcObject = stream;
      })
      .catch(console.error);
  }

  const [scanResult, setScanResult] = useState("QR scan result");
  function handleScanner() {
    setScanResult("scanning...");
    const html5QrCode = new Html5Qrcode("qr-container");
    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps: 20, aspectRatio: 1 },
        (code) => {
          setScanResult(code);
          html5QrCode.stop().catch((e) => console.error("scanner stop error", e));
        },
        (e, err) => console.error("scan error", e, err)
      )
      .catch((e) => console.error("scanner start error ", e));
  }

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta
          name="description"
          content="Generated by create-t3-app"
        />
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Create <span className="text-[hsl(280,100%,70%)]">T3</span> App
          </h1>
          <button
            className="rounded-full bg-purple-700 p-4 text-lime-300 outline outline-1 outline-lime-300"
            onClick={handleScanner}
          >
            HTML5QR SCANNER START
          </button>
          <div className="text-white">{scanResult}</div>
          <div
            id="qr-container"
            className="aspect-square h-56 overflow-hidden rounded-3xl bg-purple-900 object-cover shadow-[0_0_40px_3px] shadow-purple-300"
          />
          <button
            className="rounded-full bg-purple-700 p-4 text-lime-300 outline outline-1 outline-lime-300"
            onClick={handleMedia}
          >
            GIVE CAMERA ACCESS
          </button>
          <video
            ref={camera}
            autoPlay
            className="aspect-square h-56 overflow-hidden rounded-3xl bg-purple-900 object-cover shadow-[0_0_40px_3px] shadow-purple-300"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
              href="https://create.t3.gg/en/usage/first-steps"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">First Steps →</h3>
              <div className="text-lg">
                Just the basics - Everything you need to know to set up your database and
                authentication.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
              href="https://create.t3.gg/en/introduction"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">Documentation →</h3>
              <div className="text-lg">
                Learn more about Create T3 App, the libraries it uses, and how to deploy it.
              </div>
            </Link>
            b vid div
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-white">
              {hello.data ? hello.data.greeting : "Loading tRPC query..."}
            </p>
            <AuthShowcase />
          </div>
        </div>
      </main>
    </>
  );
}

function AuthShowcase() {
  const { data: sessionData } = useSession();

  const { data: secretMessage } = api.example.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined }
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
        {secretMessage && <span> - {secretMessage}</span>}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
}
