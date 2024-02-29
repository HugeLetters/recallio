import { tw } from "@/utils";
import { indexOf } from "@/utils/array";
import { DerivedStore, Store, useStore } from "@/utils/store";
import type { DiscriminatedUnion, Icon } from "@/utils/type";
import * as Toolbar from "@radix-ui/react-toolbar";
import type { LinkProps } from "next/link";
import Link from "next/link";
import router, { useRouter } from "next/router";
import type { ComponentProps, ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from "react";
import { Flipper } from "react-flip-toolkit";
import LucidePen from "~icons/custom/pen";
import UploadIcon from "~icons/custom/photo-upload";
import ScanIcon from "~icons/custom/scan";
import SearchIcon from "~icons/iconamoon/search-light";
import ProfileIcon from "~icons/ion/person-outline";
import LeftArrowIcon from "~icons/uil/arrow-left";
import { Flipped } from "./Animation";
import { ToolbarLink } from "./Toolbar";

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
  const translate = useStore(scanTypeOffsetStore);

  return (
    <footer className="flex h-16 justify-center bg-white text-sm text-neutral-400 shadow-around sa-o-15 sa-r-2 lg:h-20 lg:text-base">
      <Toolbar.Root asChild>
        <nav className="grid w-full max-w-app grid-cols-[1fr,auto,1fr] justify-items-center">
          <Flipper
            flipKey={pathname}
            spring={{ stiffness: 350, damping: 25 }}
            className="contents"
          >
            <FooterLink
              href="/search"
              label="Search"
              Icon={SearchIcon}
              active={pathname.startsWith("/search")}
            />
            <ToolbarLink
              href="/scan"
              className={tw(
                "relative flex size-16 -translate-y-1/4 items-center justify-center overflow-hidden rounded-full p-4 transition duration-300",
                "outline-none ring-offset-2 focus-visible:ring-2",
                pathname.startsWith("/scan")
                  ? "bg-app-green-500 text-white ring-app-green-500"
                  : "bg-neutral-100 ring-current",
              )}
            >
              <div
                className="absolute grid h-full w-[300%] -translate-x-[var(--translate)] grid-cols-3 transition-transform duration-300"
                style={{ "--translate": `${translate}%` }}
              >
                {scanTypeList.map((scanType) => {
                  const Icon = getScannerIcon(scanType);
                  return (
                    <Icon
                      key={scanType}
                      className="size-full p-4"
                    />
                  );
                })}
              </div>
            </ToolbarLink>
            <FooterLink
              href="/profile"
              label="Profile"
              Icon={ProfileIcon}
              active={pathname.startsWith("/profile")}
            />
          </Flipper>
        </nav>
      </Toolbar.Root>
    </footer>
  );
}

type FooterItemProps = {
  href: LinkProps["href"];
  label: string;
  Icon: Icon;
  active: boolean;
};
function FooterLink({ active, Icon, label, href }: FooterItemProps) {
  return (
    <ToolbarLink
      href={href}
      className={tw(
        "group relative flex flex-col items-center justify-center overflow-y-clip px-6 outline-none transition-colors",
        active && "text-app-green-500",
      )}
    >
      <Icon className="size-6 lg:size-7" />
      <span className="relative">
        {label}
        <div className="absolute -inset-x-1 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-current transition-transform group-focus-visible:scale-x-100" />
      </span>
      {/* Thanks for this tweet https://twitter.com/AetherAurelia/status/1734091704938995748?t=PuyJt96aEhEPRYgLVJ_6iQ for inspiring me for this */}
      {active && (
        <Flipped
          flipId="active-icon-bg"
          className="animate-scale-in"
        >
          <div className="absolute -inset-y-6 inset-x-4 -z-10 bg-app-green-150 blur-xl lg:inset-x-2" />
        </Flipped>
      )}
    </ToolbarLink>
  );
}

const scanTypeList = ["upload", "scan", "input"] as const;
type ScanType = (typeof scanTypeList)[number];
class ScanTypeStore extends Store<ScanType> {
  select(scanType: ScanType) {
    this.setState(scanType);
  }
  move(by: number) {
    this.updateState((state) => {
      const currentIndex = indexOf(scanTypeList, state);
      const fallbackIndex = by > 0 ? 2 : 0;
      return scanTypeList[(currentIndex ?? fallbackIndex) + by] ?? scanTypeList[fallbackIndex];
    });
  }
  reset() {
    this.setState("scan");
  }
}

export const scanTypeStore = new ScanTypeStore("scan");
export const scanTypeOffsetStore = new DerivedStore(
  scanTypeStore,
  (state) => (100 * ((indexOf(scanTypeList, state) ?? 2) - 1)) / scanTypeList.length,
);

function getScannerIcon(scanType: ScanType) {
  switch (scanType) {
    case "upload":
      return UploadIcon;
    case "input":
      return LucidePen;
    case "scan":
      return ScanIcon;
    default:
      const x: never = scanType;
      return x;
  }
}
