import Link from "next/link";
import { useRouter } from "next/router";
import ScanIcon from "~icons/custom/scan.jsx";
import SearchIcon from "~icons/iconamoon/search.jsx";
import ProfileIcon from "~icons/ion/person-outline.jsx";
export default function Footer() {
  const route = useRouter().pathname;

  return (
    <footer className="flex h-20 justify-center bg-white text-neutral-400 shadow-top shadow-black/10">
      <nav className="grid w-full max-w-md grid-cols-[1fr,auto,1fr] items-center justify-items-center">
        <Link
          href="/search"
          className={`flex flex-col items-center ${
            route.startsWith("/search") ? "text-green-500" : ""
          }`}
        >
          <SearchIcon className="h-7 w-7" />
          <span>Search</span>
        </Link>
        <Link
          href="/scan"
          className={`flex h-16 w-16 -translate-y-1/3 items-center justify-center rounded-full p-3 ${
            route.startsWith("/scan") ? "bg-green-500 text-white" : "bg-neutral-100"
          }`}
        >
          <ScanIcon className="h-full w-full" />
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center ${
            route.startsWith("/profile") ? "text-green-500" : ""
          }`}
        >
          <ProfileIcon className="h-7 w-7" />
          <span>Profile</span>
        </Link>
      </nav>
    </footer>
  );
}
