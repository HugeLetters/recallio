import { getQueryParam } from "@/browser/query";
import { Image } from "@/image";
import { tw } from "@/styles/tw";
import type { Nullish } from "@/utils/type";
import * as Separator from "@radix-ui/react-separator";
import { Slot } from "@radix-ui/react-slot";
import { useRouter } from "next/router";
import type { ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from "react";
import { Fragment, forwardRef } from "react";
import MilkIcon from "~icons/custom/milk";
import PlusIcon from "~icons/material-symbols/add-rounded";
import MinusIcon from "~icons/material-symbols/remove-rounded";

type CommentSectionProps = { children: ReactNode[] };
export function CommentSection({ children }: CommentSectionProps) {
  const separator = <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />;
  const filtered = children.filter(Boolean);
  const lastIndex = filtered.length - 1;

  return (
    <div className="grid grid-cols-[2.5rem_auto] gap-y-2 rounded-lg p-4 outline outline-1 outline-app-green-500 focus-within:outline-2">
      {filtered.map((element, i) => (
        <Fragment key={i}>
          {element}
          {i !== lastIndex && separator}
        </Fragment>
      ))}
    </div>
  );
}

type CommentProps = { children: string; className?: string };
export function Comment({ children, className }: CommentProps) {
  return (
    <div className={tw("overflow-hidden whitespace-pre-wrap break-words pt-1.5", className)}>
      {children}
    </div>
  );
}

export function ProsIcon() {
  return <PlusIcon className="h-fit w-full text-app-green-500" />;
}

export function ConsIcon() {
  return <MinusIcon className="h-fit w-full text-app-red-500" />;
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
