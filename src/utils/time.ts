import { useEffect, useState } from "react";

export function useDelayed(delayMs: number) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setElapsed(true);
    }, delayMs);

    return () => {
      clearTimeout(t);
    };
  }, [delayMs]);

  return elapsed;
}
