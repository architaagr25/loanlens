"use client";

import { useEffect, useRef, useState } from "react";

// tween a number from its old value to the new one so figures animate instead
// of snapping. starts where it currently is (handles fast back-to-back changes).
// first render shows the target as-is, so there's no SSR/hydration weirdness.
export function useCountUp(target, duration = 450) {
  const [display, setDisplay] = useState(target);
  const ref = useRef({ raf: 0, value: target });

  useEffect(() => {
    const state = ref.current;
    const from = state.value; // animate from whatever's on screen right now
    const to = target;
    if (from === to) return;

    cancelAnimationFrame(state.raf);
    let startTs = null;
    const tick = (ts) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic - quick then settles
      state.value = from + (to - from) * eased;
      setDisplay(state.value);
      if (t < 1) state.raf = requestAnimationFrame(tick);
      else state.value = to;
    };
    state.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(state.raf);
  }, [target, duration]);

  return display;
}
