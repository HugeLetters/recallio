import { getQueryParam } from "@/utils/query";
import * as Separator from "@radix-ui/react-separator";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  Fragment,
  forwardRef,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import MilkIcon from "~icons/custom/milk";
import PlusIcon from "~icons/material-symbols/add-rounded";
import MinusIcon from "~icons/material-symbols/remove-rounded";
import { Button } from "../UI";

type ProsConsCommentWrapperProps = { children: ReactNode[] };
export function ProsConsCommentWrapper({ children }: ProsConsCommentWrapperProps) {
  const separator = <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />;
  const filtered = children.filter(Boolean);
  const lastIndex = filtered.length - 1;

  return (
    <div className="grid grid-cols-[2.5rem_auto] gap-y-2 rounded-lg p-4 outline outline-1 outline-app-green focus-within:outline-2">
      {filtered.map((element, i) => (
        <Fragment key={i}>
          {element}
          {i !== lastIndex && separator}
        </Fragment>
      ))}
    </div>
  );
}

export function ProsIcon() {
  return <PlusIcon className="h-fit w-full text-app-green" />;
}

export function ConsIcon() {
  return <MinusIcon className="h-fit w-full text-app-red" />;
}

type ImagePreviewProps = { src: string };
export function ImagePreview({ src }: ImagePreviewProps) {
  return (
    <Image
      alt="Review image"
      src={src}
      width={144}
      height={144}
      sizes="144px"
      className="size-full rounded-full object-cover"
    />
  );
}

export function NoImagePreview() {
  return (
    <div className="flex h-full items-center justify-center rounded-full bg-neutral-400 p-2 text-white">
      <MilkIcon className="size-full" />
    </div>
  );
}

type CategoryButtonProps = PropsWithChildren<ComponentPropsWithoutRef<"button">>;
export const CategoryButton = forwardRef<HTMLButtonElement, CategoryButtonProps>(
  function CategoryButton({ children, className, ...props }, ref) {
    return (
      <Button
        ref={ref}
        className={`flex h-10 items-center gap-1 rounded-xl bg-neutral-400/15 px-3 py-1 capitalize text-neutral-400 outline-neutral-300 ${
          className ?? ""
        }`}
        {...props}
      >
        {children}
      </Button>
    );
  },
);

export function BarcodeTitle() {
  const { query } = useRouter();
  const barcode = getQueryParam(query.id);
  return barcode ?? "Recallio";
}
