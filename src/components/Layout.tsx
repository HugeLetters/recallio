import { tw } from "@/utils";
import { indexOf } from "@/utils/array";
import type { DiscriminatedUnion, Icon } from "@/utils/type";
import { useAtomValue } from "jotai/react";
import { atomWithReducer } from "jotai/utils";
import type { LinkProps } from "next/link";
import Link from "next/link";
import router, { useRouter } from "next/router";
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import { Flipper } from "react-flip-toolkit";
import LucidePen from "~icons/custom/pen";
import UploadIcon from "~icons/custom/photo-upload";
import ScanIcon from "~icons/custom/scan";
import SearchIcon from "~icons/iconamoon/search-light";
import ProfileIcon from "~icons/ion/person-outline";
import LeftArrowIcon from "~icons/uil/arrow-left";
import { Flipped } from "./Animation";

type LayoutProps = {
  header?: ComponentProps<typeof Header>;
};
export function Layout({ children, header }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="grid h-dvh w-full grid-rows-[auto_1fr_auto] bg-white">
      <Header {...(header ?? { title: "Recallio", left: null, right: null })} />
      <main className="scrollbar-gutter flex w-full max-w-app justify-center justify-self-center overflow-y-auto">
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

function Footer() {
  const { pathname } = useRouter();
  const selection = useAtomValue(selectionAtom);
  const ScannerIcon = getFooterIcon(selection);

  // Thanks for this tweet https://twitter.com/AetherAurelia/status/1734091704938995748?t=PuyJt96aEhEPRYgLVJ_6iQ for inspiring me for this
  const activeBackground = (
    <Flipped
      flipId="active-icon-bg"
      className="animate-scale-in"
    >
      <div className="absolute -inset-y-6 inset-x-4 -z-10 bg-app-green-150 blur-xl lg:inset-x-2" />
    </Flipped>
  );

  return (
    <footer className="flex h-16 justify-center bg-white text-sm text-neutral-400 shadow-around sa-o-15 sa-r-2 lg:h-20 lg:text-base">
      <nav className="grid w-full max-w-app grid-cols-[1fr,auto,1fr] justify-items-center">
        <Flipper
          flipKey={pathname}
          spring={{ stiffness: 350, damping: 25 }}
          className="contents"
        >
          <FooterItem
            href="/search"
            label="Search"
            activeBackground={pathname.startsWith("/search") ? activeBackground : null}
            Icon={SearchIcon}
          />
          <Link
            href="/scan"
            className={tw(
              "flex size-16 -translate-y-1/4 items-center justify-center rounded-full p-4 transition-colors duration-300",
              pathname.startsWith("/scan") ? "bg-app-green-500 text-white" : "bg-neutral-100",
            )}
          >
            <ScannerIcon className="size-full" />
          </Link>
          <FooterItem
            href="/profile"
            label="Profile"
            activeBackground={pathname.startsWith("/profile") ? activeBackground : null}
            Icon={ProfileIcon}
          />
        </Flipper>
      </nav>
    </footer>
  );
}

type FooterItemProps = {
  href: LinkProps["href"];
  label: string;
  activeBackground: ReactElement | null;
  Icon: Icon;
};
function FooterItem({ activeBackground, Icon, label, href }: FooterItemProps) {
  return (
    <Link
      href={href}
      className={tw(
        "relative flex flex-col items-center justify-center overflow-y-clip px-6 transition-colors",
        activeBackground && "text-app-green-500",
      )}
    >
      <Icon className="size-6 lg:size-7" />
      <span>{label}</span>
      {activeBackground}
    </Link>
  );
}

const selection = ["upload", "scan", "input"] as const;
type Selection = (typeof selection)[number];
type SelectionAction = Selection | { move: number; onUpdate?: (value: Selection) => void };
function getStateAfterMove(state: Selection, move: number): Selection {
  const currentIndex = indexOf(selection, state);
  const fallbackIndex = move > 0 ? 2 : 0;
  return selection[(currentIndex ?? fallbackIndex) + move] ?? selection[fallbackIndex];
}
export const selectionAtom = atomWithReducer<Selection, SelectionAction>(
  "scan",
  (prevState, action) => {
    if (!action) return prevState;
    if (typeof action === "string") return action;
    const nextState = getStateAfterMove(prevState, action.move);
    action.onUpdate?.(nextState);
    return nextState;
  },
);

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
