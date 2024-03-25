import { useRouter } from "next/router";
import { useEffect } from "react";
import { getQueryParam, setQueryParam } from ".";

export function useQueryToggleState(queryKey: string) {
  const router = useRouter();
  const isOpen = getQueryParam(router.query[queryKey]);

  // persist query params on navigating back/forward
  useEffect(() => {
    function handler() {
      if (!isOpen) return;
      setQueryParam({ router, key: queryKey, value: null });
    }

    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
    };
  }, [isOpen, queryKey, router]);

  function setIsOpen(open: boolean) {
    setQueryParam({ router, key: queryKey, value: open ? "true" : null, push: true });
  }

  return [!!isOpen, setIsOpen] as const;
}
