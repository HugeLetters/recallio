import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex h-14 justify-center overflow-auto ">
      <div className="flex w-full max-w-md justify-between gap-2">
        <NavBar />
      </div>
    </footer>
  );
}

function NavBar() {
  return (
    <nav className="flex justify-evenly gap-2 underline">
      <Link href="/">HOME</Link>
      <Link href="/scan">SCAN</Link>
      <Link href="/profile">PROFILE</Link>
    </nav>
  );
}
