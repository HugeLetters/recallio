import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
} from "react";
import { Flipped as NativeFlipped } from "react-flip-toolkit";

export type FlippedProps = ComponentPropsWithoutRef<typeof NativeFlipped> & {
  /** Put your animation class here */
  className?: string;
};
export function Flipped({ children, className, onAppear, onExit, ...props }: FlippedProps) {
  const classList = getClassList(className);
  return (
    <NativeFlipped
      onAppear={(element, index, decisionData) => {
        if (classList) {
          element.classList.add(...classList);
          element.style.opacity = "";
        }
        onAppear?.(element, index, decisionData);
      }}
      onExit={(element, index, remove, decisionData) => {
        if (classList) {
          element.classList.add(...classList, "animate-reverse");
          element.addEventListener("animationend", remove, { once: true });
          element.style.pointerEvents = "none";
        }
        onExit?.(element, index, remove, decisionData);
      }}
      {...props}
    >
      {children}
    </NativeFlipped>
  );
}

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
        const classList = inClassList.filter((className) => !node.classList.contains(className));

        node.classList.add(...classList);
        node.addEventListener("animationend", () => {
          node.classList.remove(...classList);
        });
      }
    }

    function handleRemoved(removedNodes: NodeList, target: Node, nextSibling: Node | null) {
      if (!outClassList) return;

      for (const node of removedNodes) {
        if (!isExternalElement(node)) continue;

        node.classList.add(...outClassList);
        node.setAttribute(markerAttributeName, id);

        target.insertBefore(node, nextSibling);
        node.addEventListener("animationend", () => {
          node.remove();
        });
      }
    }

    const observer = new MutationObserver((events) => {
      // we do it in reverse cause... uhm... cause if several elements are removed at the same time in normal order your reference to the nextSibling will be out of date actually cause it also got removed. So we do it in reverse
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

function getClassList(classNames?: string) {
  return classNames?.split(" ").filter(Boolean);
}
