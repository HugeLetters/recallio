import { Flipped } from "@/animation/flip";
import { useScrollDown } from "@/browser/scroll/down";
import type { Icon } from "@/image/icon";
import { ToolbarLink } from "@/interface/toolbar";
import type { ScanType } from "@/scan/store";
import { scanTypeList, scanTypeOffsetStore } from "@/scan/store";
import { useStore } from "@/state/store";
import { tw } from "@/styles/tw";
import * as Toolbar from "@radix-ui/react-toolbar";
import type { LinkProps } from "next/link";
import { useRouter } from "next/router";
import { Flipper } from "react-flip-toolkit";
import LucidePen from "~icons/custom/pen";
import UploadIcon from "~icons/custom/photo-upload";
import BarcodeIcon from "~icons/custom/scan";
import SearchIcon from "~icons/iconamoon/search-light";
import ProfileIcon from "~icons/ion/person-outline";
import { layoutLongScrollTracker } from "./long-scroll-tracker";
import { layoutMainStore } from "./store";
import { useScrollEnd } from "@/browser/scroll/end";

export function Footer() {
  const isLayoutLongScroll = useStore(layoutLongScrollTracker);
  const main = useStore(layoutMainStore);
  const isScrolled = useScrollDown({ downThreshold: 100, target: main, resetOnUp: true });
  const isScrollEnd = useScrollEnd(main);
  const hideFooter = isScrolled || isScrollEnd;

  return (
    <footer
      className={tw(
        "bottom-0 flex h-16 w-full shrink-0 justify-center bg-white text-neutral-500 shadow-around sa-o-15 sa-r-2 max-xl:text-sm xl:h-20",
        isLayoutLongScroll ? "fixed transition-opacity duration-300" : "sticky",
        isLayoutLongScroll && hideFooter && "pointer-events-none opacity-20",
      )}
    >
      <NavBar />
    </footer>
  );
}

function NavBar() {
  const { pathname } = useRouter();
  return (
    <nav className="w-full max-w-app">
      <Toolbar.Root className="grid h-full grid-cols-[1fr,auto,1fr] justify-items-center">
        <Flipper
          flipKey={pathname}
          spring={{ stiffness: 350, damping: 25 }}
          className="contents"
        >
          <NavLink
            href="/search"
            label="Search"
            Icon={SearchIcon}
            active={pathname === "/search"}
          />
          <ToolbarLink
            aria-label="scan"
            href="/scan"
            className={tw(
              "relative flex size-16 -translate-y-1/4 items-center justify-center overflow-hidden rounded-full p-4 transition duration-300",
              "outline-none ring-offset-2 focus-visible:ring-2",
              pathname === "/scan"
                ? "bg-app-green-500 text-white ring-app-green-500"
                : "bg-neutral-100 ring-current",
            )}
          >
            <ScannerIcon />
          </ToolbarLink>
          <NavLink
            href="/profile"
            label="Profile"
            Icon={ProfileIcon}
            active={pathname === "/profile"}
          />
        </Flipper>
      </Toolbar.Root>
    </nav>
  );
}

type NavLibkProps = {
  href: LinkProps["href"];
  label: string;
  Icon: Icon;
  active: boolean;
};
function NavLink({ active, Icon, label, href }: NavLibkProps) {
  return (
    <ToolbarLink
      href={href}
      className={tw(
        "group relative flex flex-col items-center justify-center overflow-y-clip px-6 outline-none transition-colors",
        active && "text-app-green-500",
      )}
    >
      <Icon className="size-6 xl:size-7" />
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
          <div className="absolute -inset-y-6 inset-x-4 -z-10 bg-app-green-150 blur-xl xl:inset-x-2" />
        </Flipped>
      )}
    </ToolbarLink>
  );
}

const SCANNER_TYPE_ICON_MAP: Record<ScanType, Icon> = {
  upload: UploadIcon,
  input: LucidePen,
  scan: BarcodeIcon,
};
function ScannerIcon() {
  const translate = useStore(scanTypeOffsetStore);

  return (
    <div
      className="absolute grid h-full w-[300%] -translate-x-[--tx] grid-cols-3 transition-transform duration-300"
      style={{ "--tx": `${translate * 100}%` }}
    >
      {scanTypeList.map((scanType) => {
        const Icon = SCANNER_TYPE_ICON_MAP[scanType];
        return (
          <Icon
            key={scanType}
            className="size-full p-4"
          />
        );
      })}
    </div>
  );
}
