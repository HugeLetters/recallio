import { contentStackAtom } from "@/hooks/useHeader";
import { useAtomValue } from "jotai";
import Link from "next/link";
import router from "next/router";
import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";
import type Icon from "~icons/*";
import LeftArrowIcon from "~icons/uil/arrow-left";
import HomeIcon from "~icons/uil/home-alt";

export default function Header() {
  const content = useAtomValue(contentStackAtom)
    .filter((node) => !!node.content)
    .at(-1)?.content ?? { title: "Recallio", left: null, right: null };

  return (
    <header className="flex h-14 justify-center bg-white shadow-bottom shadow-black/10">
      <div className="w-full max-w-md p-2">
        <div className="grid h-full w-full grid-cols-3 items-center">
          {content.left !== undefined ? (
            content.left
          ) : (
            <HeaderButton
              Icon={LeftArrowIcon}
              onClick={router.back}
              role="navigation"
              aria-label="back"
            />
          )}
          <h1 className="col-start-2 justify-self-center text-xl">{content.title}</h1>
          {content.right !== undefined ? (
            content.right
          ) : (
            <HeaderLink
              Icon={HomeIcon}
              href="/"
            />
          )}
        </div>
      </div>
    </header>
  );
}

type HeaderButtonProps = {
  Icon: typeof Icon;
} & HTMLAttributes<HTMLButtonElement>;
export function HeaderButton({ Icon, ...butonAttributes }: HeaderButtonProps) {
  return (
    <button
      {...butonAttributes}
      type="button"
      className="flex items-center justify-self-start"
    >
      <Icon className="h-8 w-8" />
    </button>
  );
}

type HeaderLinkProps = {
  Icon: typeof Icon;
} & ComponentPropsWithoutRef<typeof Link>;
export function HeaderLink({ Icon, ...linkAttributes }: HeaderLinkProps) {
  return (
    <Link
      {...linkAttributes}
      className="flex items-center justify-self-end"
    >
      <Icon className="h-8 w-8" />
    </Link>
  );
}
