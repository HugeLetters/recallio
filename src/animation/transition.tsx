import type { PropsWithChildren } from "react";
import { useEffect, useId, useRef } from "react";
import { getClassList, onSelfAnimationDone } from "./utils";

const markerAttributeName = "data-temp-animate-out";
type TransitionProps = {
  inClassName?: string;
  outClassName?: string;
};

export function Transition({
  children,
  inClassName,
  outClassName,
}: PropsWithChildren<TransitionProps>) {
  const divRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!divRef.current) return;
    const inClassList = getClassList(inClassName);
    const outClassList = getClassList(outClassName);

    function isExternalElement<N extends Node>(node: N): node is Element & N {
      return node instanceof Element && node.getAttribute(markerAttributeName) !== id;
    }

    function handleAdded(addedNodes: NodeList) {
      if (!inClassList) return;

      for (const node of addedNodes) {
        if (!isExternalElement(node)) continue;

        node.classList.add(...inClassList);
        onSelfAnimationDone(node, () => {
          node.classList.remove(...inClassList);
        });
      }
    }

    function handleRemoved(removedNodes: NodeList, target: Node, nextSibling: Node | null) {
      if (!outClassList) return;

      for (const node of removedNodes) {
        if (!isExternalElement(node)) continue;

        node.classList.add(...outClassList, "pointer-events-none");
        node.setAttribute(markerAttributeName, id);

        target.insertBefore(node, nextSibling);
        onSelfAnimationDone(node, () => node.remove());
      }
    }

    const observer = new MutationObserver((events) => {
      // we do it in reverse cause... uhm... cause if several elements are removed at the same time in normal order your reference to the nextSibling will be out of date actually cause it also got removed.
      for (const { addedNodes, removedNodes, target, nextSibling } of events.reverse()) {
        handleAdded(addedNodes);
        handleRemoved(removedNodes, target, nextSibling);
      }
    });

    observer.observe(divRef.current, { childList: true });

    return () => {
      observer.disconnect();
    };
  }, [id, inClassName, outClassName]);

  return (
    <div
      ref={divRef}
      className="contents"
    >
      {children}
    </div>
  );
}
