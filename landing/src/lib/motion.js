// True when the visitor has asked the OS to reduce motion. Safe during server
// rendering (returns false), so it must only ever be called from an effect —
// never during render, or the server and client markup would disagree.
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
