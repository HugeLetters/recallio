import { indexOf } from "@/utils";
import type { DiscriminatedUnion, Icon } from "@/utils/type";
import { useAtomValue } from "jotai/react";
import { atomWithReducer } from "jotai/utils";
import type { LinkProps } from "next/link";
import Link from "next/link";
import router, { useRouter } from "next/router";
import {
  useState,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import LucidePen from "~icons/custom/pen";
import UploadIcon from "~icons/custom/photo-upload";
import ScanIcon from "~icons/custom/scan";
import SearchIcon from "~icons/iconamoon/search-light";
import ProfileIcon from "~icons/ion/person-outline";
import LeftArrowIcon from "~icons/uil/arrow-left";

type LayoutProps = {
  header?: ReactNode;
};
export function Layout({ children, header }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="grid h-screen w-full grid-rows-[auto_1fr_auto] bg-white font-lato text-lime-950">
      {header ?? (
        <Header
          title="Recallio"
          left={null}
          right={null}
        />
      )}
      <main className="flex w-full max-w-app justify-center justify-self-center overflow-y-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
}

type HeaderProps = DiscriminatedUnion<
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
          <div className="grid h-full w-full grid-cols-[1fr_auto_1fr] items-center">
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
      className={`flex items-center ${className ?? ""}`}
      {...butonAttributes}
    >
      <Icon className="h-8 w-8" />
    </button>
  );
}

type HeaderLinkProps = { Icon: Icon } & ComponentPropsWithoutRef<typeof Link>;
export function HeaderLink({ Icon, className, ...linkAttributes }: HeaderLinkProps) {
  return (
    <Link
      className={`flex items-center ${className ?? ""}`}
      {...linkAttributes}
    >
      <Icon className="h-8 w-8" />
    </Link>
  );
}

function Footer() {
  const { pathname } = useRouter();
  const selection = useAtomValue(selectionAtom);
  const ScannerIcon = getFooterIcon(selection);

  // todo - add pretty effect from this tweet - https://twitter.com/AetherAurelia/status/1734091704938995748?t=PuyJt96aEhEPRYgLVJ_6iQ
  return (
    <footer className="flex h-20 justify-center bg-white text-neutral-400 shadow-around sa-o-15 sa-r-2">
      <nav className="grid w-full max-w-app grid-cols-[1fr,auto,1fr] justify-items-center">
        <FooterItem
          href="/search"
          label="Search"
          active={pathname.startsWith("/search")}
          Icon={SearchIcon}
        />
        <Link
          href="/scan"
          className={`flex h-16 w-16 -translate-y-1/4 items-center justify-center rounded-full p-4 transition-colors ${
            pathname.startsWith("/scan") ? "bg-app-green text-white" : "bg-neutral-100"
          }`}
        >
          <ScannerIcon className="h-full w-full" />
        </Link>
        <FooterItem
          href="/profile"
          label="Profile"
          active={pathname.startsWith("/profile")}
          Icon={ProfileIcon}
        />
      </nav>
    </footer>
  );
}

type FooterItemProps = {
  href: LinkProps["href"];
  label: string;
  active: boolean;
  Icon: Icon;
};
function FooterItem({ active, Icon, label, href }: FooterItemProps) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center justify-center overflow-hidden px-6 transition-colors ${
        active ? "text-app-green" : ""
      }`}
    >
      <Icon className="h-7 w-7" />
      <span>{label}</span>
      {active && <div className="absolute inset-0 inset-x-6 -z-10 bg-app-green/30 blur-lg" />}
    </Link>
  );
}

const selection = ["upload", "scan", "input"] as const;
type Selection = (typeof selection)[number];
type SelectionEvent = Selection | "next" | "prev";
export const selectionAtom = atomWithReducer<Selection, SelectionEvent>("scan", (value, action) => {
  switch (action) {
    case "upload":
    case "scan":
    case "input":
      return action;
    case "next":
      return selection[(indexOf(selection, value) ?? selection.length) + 1] ?? selection[2];
    case "prev":
      return selection[(indexOf(selection, value) ?? 0) - 1] ?? selection[0];
    default: {
      return value;
    }
  }
});

function getFooterIcon(selection: Selection) {
  switch (selection) {
    case "upload":
      return UploadIcon;
    case "input":
      return LucidePen;
    case "scan":
      return ScanIcon;
    default:
      const x: never = selection;
      return x;
  }
}
