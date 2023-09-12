import { immerAtom } from "@/utils/immer";
import { useSetAtom } from "jotai";
import { useEffect, useId, type ReactNode, useMemo } from "react";

export default function useHeader(contentGetter: () => ReactNode, deps: unknown[]): void {
  const setContentStack = useSetAtom(contentStackAtom);
  const id = useId();
  // dependencies should be explicitly provided by the callee
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const content = useMemo(contentGetter, deps);

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
