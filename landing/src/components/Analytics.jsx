import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageView } from '../lib/analytics';

// Initialises GA once and sends a page_view on every client-side route change —
// otherwise SPA navigations (e.g. home → /industries) would never be counted.
// Renders nothing; all work happens in effects, so it's inert during prerender.
export default function Analytics() {
  const { pathname } = useLocation();

  useEffect(() => { initGA(); }, []);
  useEffect(() => { trackPageView(pathname); }, [pathname]);

  return null;
}
