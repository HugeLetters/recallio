import { tw } from "@/styles/tw";
import StarIcon from "~icons/typcn/star-full-outline";

type StarProps = { highlight?: boolean; className?: string };
export function Star({ highlight, className }: StarProps) {
  return (
    <StarIcon
      className={tw("size-full", highlight ? "text-app-gold-400" : "text-neutral-200", className)}
    />
  );
}
