// Google Analytics 4 — activated only when VITE_GA_ID is set at build time.
// With no ID it is a complete no-op: no gtag script is loaded, no external
// request is made, nothing is tracked. That keeps the site fully self-contained
// (which matters while the domain is clearing security-vendor false positives)
// until analytics is deliberately switched on.
import { LOGIN_URL, SIGNUP_URL } from '../config';

export const GA_ID = import.meta.env.VITE_GA_ID || '';
export const gaEnabled = () => typeof window !== 'undefined' && !!GA_ID;

let started = false;

export function initGA() {
  if (started || !gaEnabled()) return;
  started = true;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // We send page_view manually on every route change (see trackPageView), so
  // disable the automatic one to avoid double-counting the first load.
  window.gtag('config', GA_ID, { send_page_view: false });

  // Conversion signal for ad campaigns: fire an event when someone clicks a
  // "Start Free Trial" or "Log In" link, without touching every button.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href === SIGNUP_URL) trackEvent('sign_up_click', { location: a.dataset.gaLoc || 'link' });
    else if (href === LOGIN_URL) trackEvent('login_click', { location: a.dataset.gaLoc || 'link' });
  });
}

export function trackPageView(path) {
  if (!gaEnabled() || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(name, params = {}) {
  if (!gaEnabled() || !window.gtag) return;
  window.gtag('event', name, params);
}
