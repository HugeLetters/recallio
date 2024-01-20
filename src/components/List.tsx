import type { StrictOmit } from "@/utils/type";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type Key,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import EggBasketIcon from "~icons/custom/egg-basket";
import MilkIcon from "~icons/custom/milk";

type InfiniteScrollProps<P, V> = {
  pages: P[];
  /** Retrieve values from a single page */
  getPageValues: (page: P) => V[];
  /** Render a element based on a individual value */
  children: (value: V) => ReactNode;
  /** Retireve unique list key from a value */
  getKey: (value: V) => Key;
  /** This will be invoked upon scrolling further to get more pages */
  getNextPage: () => void;
  /** Render this element if all pages are empty */
  fallback?: ReactNode;
};
export function InfiniteScroll<P, V>({
  pages,
  getPageValues,
  children,
  getKey,
  getNextPage,
  fallback,
}: InfiniteScrollProps<P, V>) {
  const triggerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!triggerRef.current) return;
    const trigger = triggerRef.current.firstElementChild;
    if (!trigger) return;

    const observer = new IntersectionObserver((events) => {
      events.forEach((event) => {
        if (event.target !== trigger || !event.isIntersecting) return;
        getNextPage();
      });
    });
    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
    // I don't want to enforce a getNextPage function to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  const lastNonEmptyPageIndex = pages.findLastIndex((page) => !!getPageValues(page).length);
  return (
    <>
      {lastNonEmptyPageIndex !== -1
        ? pages.map((page, i) => {
            const isLastPage = i === lastNonEmptyPageIndex;
            const values = getPageValues(page);

            return values.map((value, i) => {
              const isTrigger = isLastPage && i === Math.floor(values.length / 2);

              return (
                <div
                  className="contents"
                  key={getKey(value)}
                  ref={isTrigger ? triggerRef : null}
                >
                  {children(value)}
                </div>
              );
            });
          })
        : fallback}
    </>
  );
}

type CardProps = {
  image?: string | null;
  label: string;
  subtext: string[];
} & StrictOmit<ComponentPropsWithoutRef<typeof Link>, "className">;
export function Card({
  image,
  label,
  subtext,
  children,
  ...linkProps
}: PropsWithChildren<CardProps>) {
  return (
    <Link
      {...linkProps}
      className="flex items-center gap-3 rounded-xl bg-neutral-100 p-4"
    >
      {image ? (
        <Image
          src={image}
          alt=""
          width={50}
          height={50}
          sizes="50px"
          className="aspect-square h-9 w-9 rounded-full bg-white object-cover shadow-around sa-o-10 sa-r-0.5"
        />
      ) : (
        <div className="flex aspect-square h-9 w-9 items-center justify-center rounded-full bg-neutral-400 p-1">
          <MilkIcon className="h-full w-full text-white" />
        </div>
      )}
      <div className="flex h-10 min-w-0 flex-col justify-between">
        <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm capitalize">
          {label}
        </span>
        {!!subtext.length && (
          <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs capitalize text-neutral-400">
            {subtext.join(", ")}
          </span>
        )}
      </div>
      <div className="ml-auto flex shrink-0 text-lg">{children}</div>
    </Link>
  );
}

export function NoResults() {
  return (
    <div className="flex w-full grow flex-col items-center justify-center px-12">
      <EggBasketIcon className="h-auto w-full" />
      <span className="pt-4 text-xl">No results found</span>
      <span className="text-sm">Try using different keywords</span>
    </div>
  );
}
