'use client';
import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, { duration = 1800, start = 0, decimals = 0, enabled = true } = {}) {
  const [value, setValue] = useState(start);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    const range = target - start;

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function tick(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutExpo(progress);
      setValue(+(start + range * eased).toFixed(decimals));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, start, duration, decimals, enabled]);

  return value;
}
