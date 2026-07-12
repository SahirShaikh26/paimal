import { useEffect, useState } from 'react';
import useInView from '../hooks/useInView';

// Types `text` out character-by-character once scrolled into view.
// Under reduced motion it renders the full string immediately (no caret).
export default function Typewriter({ text, speed = 22, className }) {
  const [ref, inView] = useInView();
  const [shown, setShown] = useState('');
  const reduce = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setShown(text); return; }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [inView, text, speed, reduce]);

  const done = shown.length >= text.length;
  return (
    <span ref={ref} className={`${className || ''}${!reduce && !done ? ' caret' : ''}`}>
      {shown}
    </span>
  );
}
