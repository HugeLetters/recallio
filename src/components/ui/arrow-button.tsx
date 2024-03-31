import { tw } from "@/styles/tw";
import type { StrictOmit } from "@/utils/object";
import type { ComponentPropsWithoutRef } from "react";
import RightIcon from "~icons/formkit/right";

type ArrowButtonProps = StrictOmit<ComponentPropsWithoutRef<"button">, "children">;
export function ArrowButton({ className, ...props }: ArrowButtonProps) {
  return (
    <button
      {...props}
      className={tw(
        "group clickable primary flex aspect-square items-center justify-center rounded-full ring-1 ring-white shadow-around sa-o-25 sa-r-1",
        className,
      )}
    >
      <RightIcon className="size-5/6 -rotate-90 transition-transform duration-200 group-active:-translate-y-0.5" />
    </button>
  );
}
