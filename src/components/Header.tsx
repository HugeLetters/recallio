import { contentStackAtom } from "@/hooks/useHeader";
import { useAtomValue } from "jotai";

export default function Header() {
  const stack = useAtomValue(contentStackAtom).filter((node) => !!node.content);

  return (
    <header className="flex h-14 justify-center rounded-lg bg-white shadow">
      <div className="flex h-full w-full max-w-md items-center justify-between gap-2">
        {stack.at(-1)?.content ?? "Recallio"}
      </div>
    </header>
  );
}
