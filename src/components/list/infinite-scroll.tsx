import type { Key, ReactNode } from "react";
import { Fragment, useEffect, useRef } from "react";

// todo - what if I just track scrolling???
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
  /** Render a loading spinner at the end of the list */
  spinner?: ReactNode;
};
export function InfiniteScroll<P, V>({
  pages,
  getPageValues,
  children,
  getKey,
  getNextPage,
  fallback,
  spinner,
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
      {lastNonEmptyPageIndex !== -1 ? (
        <>
          {pages.map((page, i) => {
            const isLastPage = i === lastNonEmptyPageIndex;
            const values = getPageValues(page);
            const triggerIndex = Math.floor(values.length / 2);

            return values.map((value, i) => {
              const isTrigger = isLastPage && i === triggerIndex;
              const key = getKey(value);
              if (!isTrigger) return <Fragment key={key}>{children(value)}</Fragment>;

              return (
                <div
                  className="contents"
                  key={key}
                  ref={triggerRef}
                >
                  {children(value)}
                </div>
              );
            });
          })}
          {spinner}
        </>
      ) : (
        fallback
      )}
    </>
  );
}
