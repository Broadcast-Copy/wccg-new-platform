"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up number. Eases from the previously shown value to `value`
 * with requestAnimationFrame (all setState happens inside rAF callbacks, never
 * synchronously in the effect body).
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  // The value the animation last settled on (start point for the next run).
  const settledRef = useRef(0);

  useEffect(() => {
    const from = settledRef.current;
    const to = value;
    if (from === to) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        settledRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // If interrupted mid-flight, the next run starts from the target so we
      // never animate backwards on re-mounts.
      settledRef.current = to;
    };
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString()}</span>;
}
