import type { Icon } from "@/image/icon";
import { tw } from "@/styles/tw";
import type { DiscriminatedUnion } from "@/utils/object";
import Link from "next/link";
import router from "next/router";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import LeftArrowIcon from "~icons/uil/arrow-left";

export type HeaderProps = DiscriminatedUnion<
  { title: ReactNode; left?: ReactNode; right?: ReactNode },
  { header: Exclude<ReactNode, undefined> }
>;
export function Header({ header, left, right, title }: HeaderProps) {
  return (
    <header className="z-10 flex h-14 min-w-0 justify-center bg-white shadow-around sa-o-15 sa-r-2">
      <div className="w-full max-w-app p-2">
        {header !== undefined ? (
          header
        ) : (
          <div className="grid size-full grid-cols-[1fr_auto_1fr] items-center">
            <div className="justify-self-start">
              {left !== undefined ? (
                left
              ) : (
                <HeaderButton
                  Icon={LeftArrowIcon}
                  onClick={router.back}
                  role="navigation"
                  aria-label="go back"
                />
              )}
            </div>
            <div className="col-start-2 justify-self-center text-xl">
              {typeof title === "string" ? <h1>{title}</h1> : title}
            </div>
            <div className="justify-self-end">{right}</div>
          </div>
        )}
      </div>
    </header>
  );
}

type HeaderButtonProps = { Icon: Icon } & ComponentPropsWithoutRef<"button">;
export function HeaderButton({ Icon, type, className, ...butonAttributes }: HeaderButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={tw("flex items-center", className)}
      {...butonAttributes}
    >
      <Icon className="size-8" />
    </button>
  );
}

type HeaderLinkProps = { Icon: Icon } & ComponentPropsWithoutRef<typeof Link>;
export function HeaderLink({ Icon, className, ...linkAttributes }: HeaderLinkProps) {
  return (
    <Link
      className={tw("flex items-center", className)}
      {...linkAttributes}
    >
      <Icon className="size-8" />
    </Link>
  );
}
