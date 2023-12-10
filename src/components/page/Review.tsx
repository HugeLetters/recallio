import * as Separator from "@radix-ui/react-separator";
import type { ReactNode } from "react";
import PlusIcon from "~icons/material-symbols/add-rounded";
import MinusIcon from "~icons/material-symbols/remove-rounded";

type ProsConsCommentWrapperProps = { children: ReactNode[] };
export function ProsConsCommentWrapper({ children }: ProsConsCommentWrapperProps) {
  const separator = <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />;
  const filtered = children.filter(Boolean);
  const lastIndex = filtered.length - 1;

  return (
    <div className="grid grid-cols-[2.5rem_auto] gap-y-2 rounded-lg p-4 outline outline-1 outline-app-green focus-within:outline-2">
      {filtered.map((element, i) => (
        <>
          {element}
          {i !== lastIndex && separator}
        </>
      ))}
    </div>
  );
}

export function ProsIcon() {
  return <PlusIcon className="h-fit w-full text-app-green" />;
}

export function ConsIcon() {
  return <MinusIcon className="h-fit w-full text-app-green" />;
}
