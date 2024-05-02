import { tw } from "@/styles/tw";
import style from "./loading.module.scss";

const root = style.root!;

export function Skeleton() {
  return <div className={tw("size-full rounded-xl", root)} />;
}
