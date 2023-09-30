import StarIcon from "~icons/material-symbols/star-rounded";
type StarProps = { highlight: boolean };
export function Star({ highlight }: StarProps) {
  return <StarIcon className={`${highlight ? "text-amber-400" : "text-neutral-300"}`} />;
}
