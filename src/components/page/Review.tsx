import * as Separator from "@radix-ui/react-separator";
import Image from "next/image";
import {
  Fragment,
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

type ImagePreviewWrapperProps = PropsWithChildren;
export function ImagePreviewWrapper({ children }: ImagePreviewWrapperProps) {
  return (
    <div className="relative h-16 w-16">
      <div className="h-full w-full overflow-hidden rounded-full">{children}</div>
    </div>
  );
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
      className="h-full w-full object-cover"
    />
  );
}

export function NoImagePreview() {
  return (
    <div className="flex h-full items-center justify-center bg-neutral-400 p-2 text-white">
      <MilkIcon className="h-full w-full" />
    </div>
  );
}

type CategoryButtonProps = PropsWithChildren<ComponentPropsWithoutRef<"button">>;
export function CategoryButton({ children, className, ...props }: CategoryButtonProps) {
  return (
    <Button
      className={`flex h-10 items-center gap-1 rounded-xl bg-neutral-400/10 px-3 py-1 capitalize text-neutral-400 outline-neutral-300 ${
        className ?? ""
      }`}
      {...props}
    >
      {children}
    </Button>
  );
}
