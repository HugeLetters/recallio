export function onSelfAnimationDone(element: Element, listener: (event: Event) => void) {
  function cleanup(event: Event) {
    if (event.target !== element) return;
    listener(event);
    element.removeEventListener("animationend", cleanup);
    element.removeEventListener("animationcancel", cleanup);
  }

  element.addEventListener("animationend", cleanup);
  element.addEventListener("animationcancel", cleanup);
}

export function onSelfTransitionDone(element: HTMLElement, listener: (event: Event) => void) {
  function cleanup(event: Event) {
    if (event.target !== element) return;
    listener(event);
    element.removeEventListener("transitionend", cleanup);
    element.removeEventListener("transitioncancel", cleanup);
  }

  element.addEventListener("transitionend", cleanup);
  element.addEventListener("transitioncancel", cleanup);
}

export function getClassList(classNames?: string) {
  return classNames?.split(" ").filter(Boolean);
}
