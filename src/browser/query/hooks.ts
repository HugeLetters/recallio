import { useRouter } from "next/router";
import { useCallback, useEffect } from "react";
import { getQueryParam, setQueryParam } from ".";

export function useQueryToggleState(queryKey: string) {
  const router = useRouter();
  const value = getQueryParam(router.query[queryKey]);

  // if other query params were changed with replace instead of push will this was active - going back will reset them too.
  // This workaround prevents that
  useEffect(() => {
    function handler() {
      if (!value) return;
      setQueryParam({ router, key: queryKey, value: null });
    }

    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
    };
  }, [value, queryKey, router]);

  function setValue(open: boolean) {
    setQueryParam({ router, key: queryKey, value: open ? "true" : null, push: true });
  }

  return [!!value, useCallback(setValue, [router, queryKey])] as const;
}
