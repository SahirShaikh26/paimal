// Build-time static prerender: renders each route to HTML and bakes it into the
// built index.html, so crawlers and link-preview bots get real content + meta.
// Runs after `vite build` (client) and `vite build --ssr` (server bundle).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abs = (p) => path.resolve(__dirname, p);

const template = fs.readFileSync(abs('dist/index.html'), 'utf-8');
const { render } = await import('./dist-server/entry-server.js');

// Default (home) strings present in index.html — replaced per route below.
const HOME = {
  title: 'Paimal — Field Service Management Software for Growing Teams',
  desc: 'Run your whole field operation from one screen — scheduling, attendance, jobs, customers, billing and payments, plus an AI daily digest. Free 14-day trial.',
  ogTitle: 'Paimal — Run your entire field operation from one screen',
  ogDesc: 'Scheduling, attendance, jobs, customers, billing and payments — plus an AI digest that writes your reports. Built for field service teams. Free 14-day trial.',
  urlAttr: '"https://paimal.com/"', // quoted so it can't match the og-image URL
};

const ROUTES = [
  { path: '/', out: 'dist/index.html' },
  {
    path: '/industries',
    out: 'dist/industries/index.html',
    title: 'Industries — One platform for every field service trade | Paimal',
    desc: 'Plumbing, HVAC, electrical, pest control, elevators, solar, security and IT AMC — see how each trade runs on Paimal: customers, assets, jobs, and the people doing the work.',
    ogTitle: 'Paimal for every field service trade',
    urlAttr: '"https://paimal.com/industries"',
  },
];

const swap = (html, from, to) => (to && to !== from ? html.split(from).join(to) : html);

for (const r of ROUTES) {
  let html = template.replace('<!--app-html-->', render(r.path));
  html = swap(html, HOME.title, r.title);
  html = swap(html, HOME.desc, r.desc);
  html = swap(html, HOME.ogTitle, r.ogTitle);
  html = swap(html, HOME.ogDesc, r.desc);   // reuse the route description for OG/Twitter
  html = swap(html, HOME.urlAttr, r.urlAttr);

  const outPath = abs(r.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log('prerendered', r.path, '->', r.out);
}
