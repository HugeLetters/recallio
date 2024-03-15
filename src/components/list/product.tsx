import type { StrictOmit } from "@/utils/object";
import Image from "next/image";
import type { LinkProps } from "next/link";
import type { PropsWithChildren } from "react";
import EggBasketIcon from "~icons/custom/egg-basket";
import MilkIcon from "~icons/custom/milk";
import { ToolbarLink } from "../ui/toolbar";

type CardProps = {
  image?: string | null;
  label: string;
  subtext: string[];
} & StrictOmit<LinkProps, "className">;
/**
 * Has to be wrapped in `Toolbar.Root` since it uses `Toolbar.Link`
 */
export function Card({
  image,
  label,
  subtext,
  children,
  ...linkProps
}: PropsWithChildren<CardProps>) {
  return (
    <ToolbarLink
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
          className="aspect-square size-9 shrink-0 rounded-full bg-white object-cover shadow-around sa-o-10 sa-r-0.5"
        />
      ) : (
        <div className="flex aspect-square size-9 items-center justify-center rounded-full bg-neutral-400 p-1">
          <MilkIcon className="size-full text-white" />
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
    </ToolbarLink>
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
