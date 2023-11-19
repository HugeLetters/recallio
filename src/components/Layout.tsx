import type { DiscriminatedUnion, Icon } from "@/utils";
import Link from "next/link";
import router, { useRouter } from "next/router";
import type { ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from "react";
import ScanIcon from "~icons/custom/scan";
import SearchIcon from "~icons/iconamoon/search-light";
import ProfileIcon from "~icons/ion/person-outline";
import LeftArrowIcon from "~icons/uil/arrow-left";

type LayoutProps = {
  header?: ComponentPropsWithoutRef<typeof Header>;
  footer?: ComponentPropsWithoutRef<typeof Footer>;
};
export function Layout({ children, header, footer }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="grid h-screen w-full grid-rows-[auto_1fr_auto] bg-white font-lato text-lime-950">
      <Header {...(header ?? { title: "Recallio", left: null, right: null })} />
      <main className="flex w-full max-w-app justify-center justify-self-center overflow-y-auto">
        {children}
      </main>
      <Footer {...footer} />
    </div>
  );
}

type HeaderProps = DiscriminatedUnion<
  { title: ReactNode; left?: ReactNode; right?: ReactNode },
  { header: Exclude<ReactNode, undefined> }
>;
function Header({ header, left, right, title }: HeaderProps) {
  return (
    <header className="z-10 flex h-14 justify-center bg-white shadow-around sa-o-10 sa-r-2.5">
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

type FooterProps = { Icon?: Icon };
function Footer({ Icon }: FooterProps) {
  const { pathname } = useRouter();
  Icon ??= ScanIcon;

  return (
    <footer className="flex h-20 justify-center bg-white text-neutral-400 shadow-around sa-o-10 sa-r-2.5">
      <nav className="grid w-full max-w-app grid-cols-[1fr,auto,1fr] items-center justify-items-center">
        <Link
          href="/search"
          className={`flex flex-col items-center transition-colors ${
            pathname.startsWith("/search") ? "text-app-green" : ""
          }`}
        >
          <SearchIcon className="h-7 w-7" />
          <span>Search</span>
        </Link>
        <Link
          href="/scan"
          className={`flex h-16 w-16 -translate-y-1/3 items-center justify-center rounded-full p-4 transition-colors ${
            pathname.startsWith("/scan") ? "bg-app-green text-white" : "bg-neutral-100"
          }`}
        >
          <Icon className="h-full w-full" />
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center transition-colors ${
            pathname.startsWith("/profile") ? "text-app-green" : ""
          }`}
        >
          <ProfileIcon className="h-7 w-7" />
          <span>Profile</span>
        </Link>
      </nav>
    </footer>
  );
}
