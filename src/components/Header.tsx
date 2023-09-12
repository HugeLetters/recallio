import { contentStackAtom } from "@/hooks/useHeader";
import type { DiscriminatedUnion } from "@/utils";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { useRouter } from "next/router";
import LeftArrowIcon from "~icons/uil/arrow-left";
import HomeIcon from "~icons/uil/home-alt";
export default function Header() {
  const stack = useAtomValue(contentStackAtom).filter((node) => !!node.content);

  return (
    <header className="flex h-14 justify-center bg-white shadow-bottom shadow-black/10">
      <div className="w-full max-w-md p-2">
        {stack.at(-1)?.content ?? (
          <CommondHeader
            title="Recallio"
            noNav
          />
        )}
      </div>
    </header>
  );
}

type CommondHeaderProps = { title: string } & DiscriminatedUnion<
  { backAction?: () => void },
  { noNav?: boolean }
>;
export function CommondHeader({ title, backAction, noNav }: CommondHeaderProps) {
  const router = useRouter();

  return (
    <div className="grid h-full w-full grid-cols-3 items-center">
      {!noNav && (
        <button
          onClick={backAction ?? router.back}
          role="navigation"
          className="flex items-center justify-self-start"
        >
          <LeftArrowIcon className="h-8 w-8" />
        </button>
      )}
      <h1 className="col-start-2 justify-self-center text-xl">{title}</h1>
      {!noNav && (
        <Link
          href="/"
          className="flex items-center justify-self-end"
        >
          <HomeIcon className="h-8 w-8" />
        </Link>
      )}
    </div>
  );
}
