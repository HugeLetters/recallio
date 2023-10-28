import type { StrictOmit } from "@/utils";
import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type Key,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import EggBasketIcon from "~icons/custom/egg-basket.jsx";
import MilkIcon from "~icons/custom/milk.jsx";

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
  /** This class will be applied to a wrapper div around an element which triggers getNextPage */
  className?: string;
};
export function InfiniteScroll<P, V>({
  pages,
  getPageValues,
  children,
  getKey,
  getNextPage,
  className,
}: InfiniteScrollProps<P, V>) {
  const lastPage = pages.at(-1);
  const triggerElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerElement.current) return;

    const observer = new IntersectionObserver((events) => {
      events.forEach((event) => {
        if (event.target !== triggerElement.current || !event.isIntersecting) return;
        getNextPage();
      });
    });
    observer.observe(triggerElement.current);

    return () => {
      observer.disconnect();
    };
    // I don't want to enforce a getNextPage function to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  return (
    <>
      {pages.map((page) => {
        const isLastPage = page === lastPage;
        const values = getPageValues(page);
        const triggerValue = values.at(-values.length / 2) ?? values[0];

        return values.map((value) => {
          const isTriggerValue = isLastPage && value === triggerValue;
          const key = getKey(value);
          return isTriggerValue ? (
            <div
              className={`!relative ${className ?? ""}`}
              key={key}
            >
              {children(value)}
              {isTriggerValue && (
                <div
                  className="sr-only"
                  ref={triggerElement}
                />
              )}
            </div>
          ) : (
            <Fragment key={key}>{children(value)}</Fragment>
          );
        });
      })}
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
          className="aspect-square h-9 w-9 rounded-full bg-white object-cover shadow-around sa-o-10 sa-r-0.5"
        />
      ) : (
        <div className="flex aspect-square h-9 w-9 items-center justify-center rounded-full bg-neutral-400 p-1">
          <MilkIcon className="h-full w-full text-white" />
        </div>
      )}
      <div className="flex h-full min-w-0 flex-col items-start gap-1">
        <span className="text-sm capitalize">{label}</span>
        {!!subtext.length && (
          <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs capitalize text-neutral-400">
            {subtext.join(", ")}
          </span>
        )}
      </div>
      <div className="ml-auto flex text-lg">{children}</div>
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
