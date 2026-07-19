import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect is a no-op (and warns) during server rendering. Prerendered
// components use this to reset their animated state before the first paint,
// so the server HTML can hold the *finished* value without it flashing.
export default typeof window !== 'undefined' ? useLayoutEffect : useEffect;
