import useInView from '../hooks/useInView';

// Wraps children so they rise + fade in the first time they scroll into view.
// `delay` staggers siblings; motion is disabled via CSS under prefers-reduced-motion.
export default function Reveal({ children, as: Tag = 'div', delay = 0, className = '', style, ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? ' in' : ''}${className ? ' ' + className : ''}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
