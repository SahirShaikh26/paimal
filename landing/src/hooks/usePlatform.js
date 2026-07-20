import { useEffect, useState } from 'react';

// Detects the visitor's OS *after* hydration. It returns null on the server and
// on the first client render (so the markup matches and hydration stays clean),
// then resolves to 'android' | 'ios' | 'other' in an effect. Callers should
// render a platform-neutral default until it's known.
export default function usePlatform() {
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) setPlatform('android');
    else if (/iphone|ipad|ipod/i.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1)) setPlatform('ios');
    else setPlatform('other');
  }, []);

  return platform;
}
