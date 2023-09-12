import SearchIcon from "~icons/iconamoon/search";
import BarcodeIcon from "~icons/ph/barcode-light";
import Link from "next/link";
import ProfileIcon from "~icons/ion/person-outline";
export default function Footer() {
  return (
    <footer className="flex h-20 justify-center bg-white text-neutral-400 shadow-top shadow-black/10">
      <nav className="grid w-full max-w-md grid-cols-[1fr,auto,1fr] items-center justify-items-center">
        <Link
          href="/search"
          className="flex flex-col items-center"
        >
          <SearchIcon className="h-7 w-7" />
          <span>Search</span>
        </Link>
        <Link
          href="/scan"
          className="flex h-16 w-16 -translate-y-1/3 items-center justify-center rounded-full bg-neutral-100 p-3 "
        >
          <BarcodeIcon className="h-full w-full" />
        </Link>
        <Link
          href="/profile"
          className="flex flex-col items-center"
        >
          <ProfileIcon className="h-7 w-7" />
          <span>Profile</span>
        </Link>
      </nav>
    </footer>
  );
}
