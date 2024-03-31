import { getQueryParam } from "@/browser/query";
import { ArrowButton } from "@/components/ui/arrow-button";
import { Image } from "@/image";
import type { Icon } from "@/image/icon";
import { tw } from "@/styles/tw";
import type { RouterOutputs } from "@/trpc";
import type { Nullish } from "@/utils/type";
import * as Separator from "@radix-ui/react-separator";
import { Slot } from "@radix-ui/react-slot";
import { useRouter } from "next/router";
import type { ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from "react";
import { Fragment, forwardRef, useEffect, useRef, useState } from "react";
import MilkIcon from "~icons/custom/milk";
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
  const [isCollapsed, setIsCollapsed] = useState<null | boolean>(null);
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    if (content.clientHeight < content.scrollHeight) {
      setIsCollapsed(true);
    }
  }, []);

  return (
    <div className="flex py-2">
      {type && <CommentIcon type={type} />}
      <div className="min-w-0 pt-1.5">
        {isCollapsed === null ? (
          <div
            ref={contentRef}
            className="max-h-[3lh] overflow-y-scroll whitespace-pre-wrap break-words"
          >
            {children}
          </div>
        ) : (
          // ? todo - allow clicking the whole block to expand(but only arrow button to collapse)
          // todo - some blurred whie mist at the bottom to indicate this is collapsed text!
          <div
            className={tw(
              "relative grid transition-[grid-template-rows] duration-500",
              isCollapsed ? "grid-rows-[0fr_0]" : "grid-rows-[1fr_1.75rem]",
            )}
          >
            <div
              ref={contentRef}
              className="min-h-[3lh] overflow-y-hidden whitespace-pre-wrap break-words"
            >
              {children}
            </div>
            <ArrowButton
              type="button"
              aria-label={isCollapsed ? "Expand comment" : "Collapse comment"}
              onClick={() => setIsCollapsed((x) => !x)}
              className={tw(
                "size-7 -translate-x-2 animate-fade-in self-end justify-self-end",
                isCollapsed ? "-translate-y-2 -rotate-180" : "",
              )}
            />
          </div>
        )}
      </div>
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
