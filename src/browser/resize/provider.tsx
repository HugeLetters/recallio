import { useEffect } from "react";
import { resizeListeners } from "./store";

export function ResizeProvider() {
  useEffect(() => {
    function onResize() {
      resizeListeners.forEach((cb) => cb.current());
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return null;
}
