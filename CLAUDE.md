# Paimal — project guide for Claude

Paimal is a multi-tenant **field-service management SaaS** (formerly "FieldPilot" — fully rebranded; you may still see the old name in a few external identifiers noted below). Engineers log field activity; managers/directors schedule visits, run projects, quote, invoice, and get paid.

**Tagline:** *"Kaam ka gyaan ho, sahi pehchaan ho!"*

## Monorepo layout
```
backend/   Node.js + Express + PostgreSQL API (port 4000)
webapp/    React 18 + Vite PWA — the product (admin + engineer UI)
mobile/    React Native + Expo app (engineers in the field)
landing/   Vite + React marketing site
brand-assets/  Paimal brand/design deliverables (HTML mockups, icon generator)
```
All four share the one backend. This folder (`D:\Paimal`) is the canonical copy; `node_modules`, `dist`, `mobile/android`, and `.expo` are intentionally absent (regenerable) — run `npm install` in each subfolder to restore deps.

## Run locally
- **backend**: `cd backend && npm install && npm run dev` → http://localhost:4000/api/health. Needs `backend/.env` (DATABASE_URL, JWT secret; integration keys optional).
- **webapp**: `cd webapp && npm install && npm run dev` → :5173 (proxies `/api` → :4000).
- **landing**: `cd landing && npm install && npm run dev`.
- **mobile**: `cd mobile && npx expo install && npx expo start` (Expo Go), or `npx expo run:android` for a native dev build. Use **`npx expo install`, never `npm install`**, for Expo deps.

## Architecture essentials
- **Multi-tenant**: every request carries `tenant_id` in the JWT; routes use `router.use(auth, tenant)` and filter every query by tenant. Roles: **Director > Manager > Engineer**, enforced per-route.
- **DB**: Postgres via `pg` Pool + `DATABASE_URL`. Schema migrates in `backend/src/server.js` (`migrate()`), idempotent — add tables/columns there.
- **Integrations degrade gracefully (HTTP 503) when keys are absent** — don't assume they're configured: Razorpay (billing + payment links), Twilio (SMS/WhatsApp), Anthropic (AI daily digest), Cloudinary (mobile photo upload). Keys are pending in the respective `.env`s.

## Brand system (design work must follow this)
- **Signature colour: marigold `#E4881F`** (bright `#F6A62A`, deep `#C2740C`) on **graphite ink `#201C16`** and **warm paper `#FBFAF7`**.
- **Primary buttons = ink** (white text, high contrast). **Marigold = accent only** (links, active states, values, the mark). Status green `#3F8F5B` / amber `#C08A1B` / red `#C0492F`.
- **The mark**: a solid "P" monogram whose counter is a **checkmark** ("work done / verified"). A bare tick is the compact glyph (favicons, tiny UI). Components: `webapp/src/components/PaimalMark.jsx`, `mobile/src/components/PaimalMark.jsx` (drawn with Views, no react-native-svg), `landing/src/components/PaimalLogo.jsx`. It's a *living* mark — draws its tick on load, re-ticks on hover (`webapp/src/brand.css`).
- **Colour tokens live in `webapp/src/theme.js` and `mobile/src/theme.js`** — use tokens, don't hardcode hex. Line icons: `webapp/src/components/Icon.jsx` (no emoji in UI).
- Type voice: system sans + monospace for labels/data/numbers.

## Deploy (production is live)
| Part | Host | Live URL(s) | Command |
|---|---|---|---|
| backend | Railway | `fieldpilot-api-production-1652.up.railway.app` | **`railway up` from inside `backend/`** |
| webapp | Vercel (project `webapp`) | **app.paimal.com**, paimalapp.vercel.app, webapp-five-lake-27.vercel.app | `vercel --prod` from `webapp/` |
| landing | Vercel (project `fieldpilot`) | **paimal.com**, www→apex, getpaimal.vercel.app | `vercel --prod` from `landing/` |

**Deploy gotchas (important):**
- **Railway**: never git-trigger/`railway redeploy` — it builds from the monorepo root and fails. Always `railway up` from inside `backend/`. **Changing environment variables (Railway dashboard *or* `railway variables`) also triggers that same broken git-based redeploy and drops the API back to stale/old code — so after *any* variable change, immediately re-run `railway up` from `backend/` to restore the correct build.**
- **Email (Resend)**: Railway blocks outbound SMTP ports, so `backend/src/mailer.js` sends invoice emails via **Resend's HTTPS API** (not SMTP). Env: `SMTP_USER=resend`, `SMTP_PASS=<re_… key>`, `MAIL_FROM="Paimal <invoices@paimal.com>"`. Sending to real customers needs `paimal.com` **verified in Resend** (DNS records added at BigRock); until then it returns a "domain not verified" error and only Resend's test sender (`onboarding@resend.dev`, to the account owner only) works.
- **Vercel manual aliases don't auto-follow deploys**: after every **landing** deploy, re-run `vercel alias set <newest-url> getpaimal.vercel.app` **and** `... getfieldpilot.vercel.app`. After every **webapp** deploy, re-run `... paimalapp.vercel.app`. (Custom project domains `paimal.com` / `app.paimal.com` and the auto `*-five-lake-27` / `fieldpilot-ten` aliases DO auto-follow.)
- **Vercel SSO wall**: custom `.vercel.app` aliases can hit the auth wall even when the primary domain is public — fix with `vercel project protection disable <project> --sso`.
- **DNS**: `paimal.com` (bought on BigRock) uses A `@`→`76.76.21.21` + CNAME `www`/`app`→`cname.vercel-dns.com`. DNS stays at BigRock.

## Mobile build specifics
- Android package (permanent): **`com.fieldpilot.mobile`**; EAS `slug` is still `fieldpilot` (kept to preserve the EAS project link) — the display name is "Paimal".
- **Gradle needs JDK 17** — the machine's default Java breaks it. Set `JAVA_HOME` to a JDK 17 before `expo run:android` / EAS.
- **Changing app name/icons/splash needs `npx expo prebuild --clean`** (plain `run:android` won't re-apply app.json over an existing `android/`).
- Icons: opaque marigold app icon + ink adaptive foreground (transparency export via headless Chromium was unreliable — bake backgrounds in). Regenerate with `brand-assets/gen_icons.mjs` + `icons_gen.html`.
- Run `npx expo install --check` before any EAS build. A fresh **EAS production build** is still needed for the Play Store to pick up the Paimal name/icon.

## Conventions
- **Never add `Co-Authored-By` trailers to commits.**
- Commit in logical groups (by area: backend / webapp / mobile / landing).
- Prefer lightweight: no chart library (hand-rolled SVG/CSS charts); heavy deps lazy-loaded (Sentry, recharts was removed).
- Verify UI changes in a real browser/emulator before claiming done; backend features have an end-to-end check pattern (login as a demo tenant, exercise routes).

## Demo data
Two demo tenants exist in the live DB: **Apex Field Services** and **Innovative Solutions** (5 accounts, e.g. `demoadmin@innovativesolutions.com` / `Demo@12345`, roles Director/Manager×2/Engineer×2). Use these for verification, not real client data.
