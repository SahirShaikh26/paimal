import { useEffect, useState } from 'react';
import useInView from '../hooks/useInView';
import useLayout from '../hooks/useIsomorphicLayoutEffect';
import { prefersReducedMotion } from '../lib/motion';

// Types `text` out character-by-character once scrolled into view.
// Renders the full string up front so it lands in the prerendered HTML for
// crawlers and no-JS visitors; the client empties it before the first paint and
// types it back in. Under reduced motion it simply stays whole, with no caret.
export default function Typewriter({ text, speed = 22, className }) {
  const [ref, inView] = useInView();
  const [shown, setShown] = useState(text);
  const [typing, setTyping] = useState(false);

  useLayout(() => {
    if (!prefersReducedMotion()) setShown('');
  }, [text]);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    let i = 0;
    setTyping(true);
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setTyping(false);
      }
    }, speed);
    return () => { clearInterval(id); setTyping(false); };
  }, [inView, text, speed]);

  return (
    <span ref={ref} className={`${className || ''}${typing ? ' caret' : ''}`}>
      {shown}
    </span>
  );
}
