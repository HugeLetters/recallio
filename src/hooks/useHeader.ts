import { immerAtom } from "@/utils/immer";
import { useSetAtom } from "jotai";
import { useEffect, useId, type ReactNode } from "react";

export default function useHeader(content: ReactNode): void {
  const setContentStack = useSetAtom(contentStackAtom);
  const id = useId();

  useEffect(() => {
    setContentStack((x) => {
      const current = x.find((x) => x.id === id);
      if (!current) {
        x.push({ content, id });
        return;
      }

      current.content = content;
    });
  }, [id, setContentStack, content]);

  useEffect(() => {
    return () => {
      setContentStack((x) => x.filter((x) => x.id !== id));
    };
  }, [id, setContentStack]);
}

export const contentStackAtom = immerAtom<Array<{ content: ReactNode; id: string }>>([]);
