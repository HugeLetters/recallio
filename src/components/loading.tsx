import { tw } from "@/styles/tw";
import style from "./loading.module.scss";

const root = style.root!;
const error = style.error!;

export function Skeleton() {
  return (
    <div className="flex size-full flex-col gap-1">
      <div className={tw("size-full rounded-xl blur-sm", root)} />
      <div className={tw("size-full rounded-xl blur-sm", root, error)} />
    </div>
  );
}
