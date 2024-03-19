import { ToolbarLink } from "@/components/ui/toolbar";
import { Image } from "@/image";
import type { StrictOmit } from "@/utils/object";
import type { LinkProps } from "next/link";
import type { PropsWithChildren } from "react";
import EggBasketIcon from "~icons/custom/egg-basket";
import MilkIcon from "~icons/custom/milk";

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
      <div className="size-9 shrink-0">
        <Image
          src={image}
          alt=""
          width={50}
          height={50}
          className="size-full rounded-full object-cover shadow-around sa-o-10 sa-r-0.5"
        >
          <div className="flex size-full items-center justify-center rounded-full bg-neutral-400">
            <MilkIcon className="size-7 text-white" />
          </div>
        </Image>
      </div>
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
    <div className="flex w-full grow flex-col items-center justify-center px-12 text-center">
      <EggBasketIcon className="h-auto w-full" />
      <span className="pt-4 text-xl">No results found</span>
      <span className="text-sm">Try using different keywords</span>
    </div>
  );
}
