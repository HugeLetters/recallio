import { contentStackAtom } from "@/hooks/useHeader";
import { useAtomValue } from "jotai";
import Link from "next/link";
import router from "next/router";
import type { ComponentPropsWithoutRef } from "react";
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
        {content.header !== undefined ? (
          content.header
        ) : (
          <div className="grid h-full w-full grid-cols-3 items-center">
            <div className="justify-self-start">
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
            </div>
            <h1 className="col-start-2 justify-self-center text-xl">{content.title}</h1>
            <div className="justify-self-end">
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
        )}
      </div>
    </header>
  );
}

type HeaderButtonProps = {
  Icon: typeof Icon;
} & ComponentPropsWithoutRef<"button">;
export function HeaderButton({ Icon, type, className, ...butonAttributes }: HeaderButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={`flex items-center ${className}`}
      {...butonAttributes}
    >
      <Icon className="h-8 w-8" />
    </button>
  );
}

type HeaderLinkProps = {
  Icon: typeof Icon;
} & ComponentPropsWithoutRef<typeof Link>;
export function HeaderLink({ Icon, className, ...linkAttributes }: HeaderLinkProps) {
  return (
    <Link
      className={`flex items-center ${className}`}
      {...linkAttributes}
    >
      <Icon className="h-8 w-8" />
    </Link>
  );
}
