import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
} from "react";
import { Flipped as NativeFlipped } from "react-flip-toolkit";

const dataTransitionName = "data-transition";
export type FlippedProps = ComponentPropsWithoutRef<typeof NativeFlipped> & {
  /** These classes will be applied on in and out transitions. Out transition will also apply `animate-reverse` class */
  className?: string;
};
// todo - maybe add option to just define in/out classes
/**
 * You may detect if element is currently transitioning in or out with `data-transition` attribute with values `in | out`
 */
export function Flipped({ children, className, onAppear, onExit, ...props }: FlippedProps) {
  const classList = getClassList(className);
  return (
    <NativeFlipped
      onAppear={(element, index, decisionData) => {
        onAppear?.(element, index, decisionData);
        if (!classList) return;

        element.style.opacity = "";
        // we have to trigger a reflow here due to how flip library works with opacity
        element.offsetHeight;
        element.classList.add(...classList);
        element.setAttribute(dataTransitionName, "in");

        const cleanup = function () {
          element.classList.remove(...classList);
          element.removeAttribute(dataTransitionName);

          element.removeEventListener("animationcancel", cleanup);
          element.removeEventListener("animationend", cleanup);
        };
        element.addEventListener("animationend", cleanup, { once: true });
        element.addEventListener("animationcancel", cleanup, { once: true });
      }}
      onExit={(element, index, remove, decisionData) => {
        onExit?.(element, index, remove, decisionData);
        if (!classList) return remove();

        element.classList.add(...classList, "animate-reverse");
        element.setAttribute(dataTransitionName, "out");
        element.addEventListener("animationend", remove, { once: true });
        element.style.pointerEvents = "none";
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

        node.classList.add(...inClassList);
        const cleanup = function () {
          node.classList.remove(...inClassList);
        };
        node.addEventListener("animationend", cleanup, { once: true });
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
