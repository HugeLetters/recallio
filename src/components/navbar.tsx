import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="flex justify-evenly gap-2 underline">
      <Link href="/">HOME</Link>
      <Link href="/scan">SCAN</Link>
    </nav>
  );
}
