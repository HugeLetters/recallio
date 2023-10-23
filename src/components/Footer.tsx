import { selectionAtom } from "@/utils/scan";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactElement } from "react";
import LucidePen from "~icons/custom/pen";
import UploadIcon from "~icons/custom/photo-upload";
import ScanIcon from "~icons/custom/scan";
import SearchIcon from "~icons/iconamoon/search";
import ProfileIcon from "~icons/ion/person-outline";

export default function Footer() {
  const route = useRouter().pathname;
  const selection = useAtomValue(selectionAtom);

  function getScanIcon(): ReactElement {
    switch (selection) {
      case "upload":
        return <UploadIcon className="h-full w-full" />;
      case "input":
        return <LucidePen className="h-full w-full" />;
      case "scan":
        return <ScanIcon className="h-full w-full" />;
      default:
        const x: never = selection;
        return x;
    }
  }

  return (
    <footer className="flex h-20 justify-center bg-white text-neutral-400 shadow-top shadow-black/10">
      <nav className="grid w-full max-w-app grid-cols-[1fr,auto,1fr] items-center justify-items-center">
        <Link
          href="/search"
          className={`flex flex-col items-center transition-colors ${
            route.startsWith("/search") ? "text-app-green" : ""
          }`}
        >
          <SearchIcon className="h-7 w-7" />
          <span>Search</span>
        </Link>
        <Link
          href="/scan"
          className={`flex h-16 w-16 -translate-y-1/3 items-center justify-center rounded-full p-4 transition-colors ${
            route.startsWith("/scan") ? "bg-app-green text-white" : "bg-neutral-100"
          }`}
        >
          {getScanIcon()}
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center transition-colors ${
            route.startsWith("/profile") ? "text-app-green" : ""
          }`}
        >
          <ProfileIcon className="h-7 w-7" />
          <span>Profile</span>
        </Link>
      </nav>
    </footer>
  );
}
