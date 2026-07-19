import { useEffect, useRef, useState } from 'react';
import useInView from '../hooks/useInView';
import useLayout from '../hooks/useIsomorphicLayoutEffect';
import { prefersReducedMotion } from '../lib/motion';

// Counts from 0 → end once scrolled into view (easeOutCubic). Respects reduced motion.
// Starts at `end` so the prerendered HTML shows the real number to crawlers and
// no-JS visitors; the client resets to 0 before its first paint, so nothing flashes.
export default function CountUp({ end, duration = 1500, prefix = '', suffix = '', decimals = 0 }) {
  const [ref, inView] = useInView();
  const [val, setVal] = useState(end);
  const started = useRef(false);

  useLayout(() => {
    if (!prefersReducedMotion()) setVal(0);
  }, []);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    if (prefersReducedMotion()) { setVal(end); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(end * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
