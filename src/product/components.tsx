import { getQueryParam } from "@/browser/query";
import { useResizeListener } from "@/browser/resize/store";
import { Image } from "@/image";
import type { Icon } from "@/image/icon";
import { tw } from "@/styles/tw";
import type { RouterOutputs } from "@/trpc";
import { clamp } from "@/utils";
import type { Nullish } from "@/utils/type";
import * as Separator from "@radix-ui/react-separator";
import { Slot } from "@radix-ui/react-slot";
import { useRouter } from "next/router";
import type { ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from "react";
import { Fragment, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import MilkIcon from "~icons/custom/milk";
import ArrowIcon from "~icons/formkit/right";
import PlusIcon from "~icons/material-symbols/add-rounded";
import MinusIcon from "~icons/material-symbols/remove-rounded";

type CommentWrapperProps = { children: ReactNode[] };
export function CommentWrapper({ children }: CommentWrapperProps) {
  const separator = <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />;
  const filtered = children.filter(Boolean);
  const lastIndex = filtered.length - 1;

  return (
    <div className="flex flex-col rounded-lg px-4 py-2 outline outline-1 outline-app-green-500 focus-within:outline-2">
      {filtered.map((element, i) => (
        <Fragment key={i}>
          {element}
          {i !== lastIndex && separator}
        </Fragment>
      ))}
    </div>
  );
}

type Review = NonNullable<RouterOutputs["user"]["review"]["getOne"]>;
type CommentSectionProps = Pick<Review, "pros" | "cons" | "comment">;
export function CommentSection({ comment, cons, pros }: CommentSectionProps) {
  if (!pros && !cons && !comment) return null;

  return (
    <CommentWrapper>
      {!!pros && <Comment type="pros">{pros}</Comment>}
      {!!cons && <Comment type="cons">{cons}</Comment>}
      {!!comment && <Comment>{comment}</Comment>}
    </CommentWrapper>
  );
}

type CommentType = "pros" | "cons";
type CommentProps = { children: string; type?: CommentType };
function Comment({ children, type }: CommentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<number>();

  const forceOverflowCheck = useCallback(() => {
    queueMicrotask(() => {
      // flushSync a reset to recalculate overflow value
      // this is just for edge cases when screen is rotated etc so a little flicker is not a problem
      flushSync(() => setOverflow(undefined));

      const content = contentRef.current;
      if (!content) return;

      const { clientHeight, scrollHeight } = content;
      if (clientHeight < scrollHeight) {
        setOverflow(scrollHeight - clientHeight);
      }
    });
  }, []);

  useEffect(forceOverflowCheck, [forceOverflowCheck, children]);
  useResizeListener(forceOverflowCheck);

  return (
    <div className="flex py-2">
      {type && <CommentIcon type={type} />}
      <div className="min-w-0 grow pt-1.5">
        {overflow === undefined ? (
          <div
            ref={contentRef}
            className="max-h-[3lh] overflow-y-scroll whitespace-pre-wrap break-words"
          >
            {children}
          </div>
        ) : (
          <CollapsibleComment overflow={overflow}>{children}</CollapsibleComment>
        )}
      </div>
    </div>
  );
}

type CollapsibleCommentProps = { overflow: number };
function CollapsibleComment({ overflow, children }: PropsWithChildren<CollapsibleCommentProps>) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  return (
    <div
      // this is not acessible on purpose - for screen reader users there is a button below
      onClick={() => {
        if (!isCollapsed) return;
        setIsCollapsed((x) => !x);
      }}
      style={{ "--duration": `${clamp(200, overflow * 2, 500)}ms` }}
      className={tw(
        "relative grid transition-[grid-template-rows] duration-[var(--duration)]",
        isCollapsed ? "cursor-pointer grid-rows-[0fr_0]" : "grid-rows-[1fr_1.25rem]",
      )}
    >
      <div className="scrollbar-gutter min-h-[3lh] overflow-y-hidden whitespace-pre-wrap break-words">
        {children}
      </div>
      <div
        className={tw(
          "pointer-events-none absolute bottom-0 h-7 w-full animate-fade-in bg-gradient-to-t from-white transition-opacity duration-[var(--duration)]",
          !isCollapsed && "opacity-0",
        )}
      />
      <button
        type="button"
        aria-label={isCollapsed ? "Expand comment" : "Collapse comment"}
        onClick={(e) => {
          e.stopPropagation();
          setIsCollapsed((x) => !x);
        }}
        className={tw(
          "clickable flex size-5 origin-center translate-x-2 animate-fade-in items-center justify-center self-end justify-self-end rounded-full outline-none outline-1 outline-offset-0 outline-transparent duration-[var(--duration)] focus-visible-within:bg-black/10 focus-visible-within:outline-app-green-500",
          isCollapsed && "translate-y-1 -rotate-180",
        )}
      >
        <ArrowIcon className="size-full -rotate-90 text-app-green-500" />
      </button>
    </div>
  );
}

type CommentIconProps = { type: CommentType };
function getIconByType(type: CommentType): Icon {
  switch (type) {
    case "pros":
      return PlusIcon;
    case "cons":
      return MinusIcon;
    default: {
      return type satisfies never;
    }
  }
}
export function CommentIcon({ type }: CommentIconProps) {
  const Icon = getIconByType(type);
  return (
    <Icon
      className={tw(
        "h-fit w-10 shrink-0",
        type === "pros" ? "text-app-green-500" : "text-app-red-500",
      )}
    />
  );
}

type Size = "md" | "sm";
const sizeToRenderSize: Record<Size, number> = { md: 144, sm: 50 };
type ImagePreviewProps = { src: Nullish<string>; size: Size };
export function ImagePreview({ src, size }: ImagePreviewProps) {
  const renderSize = sizeToRenderSize[size];
  return (
    <div className={tw("shrink-0", size === "md" ? "size-16" : "size-9")}>
      <Image
        src={src}
        alt="Review image"
        width={renderSize}
        height={renderSize}
        className="size-full rounded-full object-cover shadow-around sa-o-10 sa-r-0.5"
      >
        <div className="flex size-full items-center justify-center rounded-full bg-neutral-400 text-white">
          <MilkIcon className="size-3/4" />
        </div>
      </Image>
    </div>
  );
}

type CategoryCardProps = PropsWithChildren<ComponentPropsWithoutRef<typeof Slot>>;
export const CategoryCard = forwardRef<HTMLButtonElement, CategoryCardProps>(function _(
  { children, className, ...props },
  ref,
) {
  return (
    <Slot
      ref={ref}
      className={tw(
        "flex h-10 items-center gap-1 rounded-xl bg-neutral-400/15 px-3 py-1 capitalize text-neutral-400 outline-transparent focus-visible:outline-neutral-300",
        className,
      )}
      {...props}
    >
      {children}
    </Slot>
  );
});

export function BarcodeTitle() {
  const { query } = useRouter();
  const barcode = getQueryParam(query.id);
  return barcode ?? "Recallio";
}
