# Cook Connect — Implementation Status

Source: code audit of `cook-connect-llc/restaurant` on 2026-11-17, against `main` at `e44d9de`. The app was not run. "Finished" means the UI exists and is wired to real API/DB code.

Auth and Supabase are wired. Employee, chef, and rider areas are API-backed. Only the customer pages, `/employee/deliveries`, and `/employee/customers/[id]` are mock. Quick-role login buttons are gone.

## Landing page

### Finished

- [x] Locale landing at `/` and `/ar` (next-intl, RTL, Cairo font, toggle in `components/landing/Nav.tsx`)
- [x] Sections: hero, featured meals, healthy campaign, plan cards, about, contact map, footer (`app/[locale]/page.tsx`)
- [x] Hero top sellers live from `GET /api/showcase` (`hooks/useShowcase.ts`, 2026-10-23); meal grids from `/api/recipe`
- [x] SEO: `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, OG banners, Restaurant/WebSite JSON-LD, GA (`components/seo/GoogleTag.tsx`)
- [x] AVIF/WebP, Supabase storage images; terms and privacy pages

### Not finished or unverified

- Plan cards use hardcoded `constants/subscriptions.ts`, not `GET /api/subscription-plans`.
- `components/landing/MealsDisplay.tsx` is unused static code.
- H5 hero manual check pending. Authenticated dashboards are English-only.

## Menu & ordering

### Finished

- [x] `/menu` SSR from Supabase (`listRecipes`), category pages `app/[locale]/menu/[category]/`
- [x] Search, category/subcategory icons, sort, skeletons, category desktop grids (2026-11-10, 2026-11-13)
- [x] Add-ons/sides: `CartSidePicker.tsx`, `MobileAddonSheet.tsx` (2026-11-10)
- [x] Checkout in `CartDialog.tsx` -> `POST /api/orders` (VAT-inclusive, consent); Mapbox delivery Ajman-only, pickup supported
- [x] Server recomputes prices/VAT (`app/api/orders/route.ts`)
- [x] Public tracking `app/[locale]/order-tracking/[code]/page.tsx` + `POST /api/order-tracking/verify`
- [x] `/catalog` 308-redirects to `/menu`

### Not finished or unverified

- Arabic menu names via `AR_CONTENT` dictionary, not DB columns.
- Sales sort pending check that delivered items carry `recipe_id`.

## Subscriptions

### Finished

- [x] Wizard `app/[locale]/subscription-onboarding/page.tsx`: Plan, Details, Preferences, Meals, Delivery, Review
- [x] Inquiries `POST /api/subscription-inquiries`; staff approve/reject
- [x] Signed invite links with negotiated price (`/api/subscription-invites`, validate) (2026-10-26)
- [x] Backend rates `GET /api/subscription-rates` (2026-10-26)
- [x] Delivery areas: Ajman free, Sharjah 100 AED, Dubai 200 AED (2026-11-06)
- [x] Food restrictions: ingredient search `/api/ingredients` + skip-category chips; meals and chef auto-fill respect them (2026-11-15, `RestrictionFields.tsx`)
- [x] Staff create form `StaffSubscriptionForm.tsx` -> `/api/subscriptions` (2026-11-12)
- [x] Employee list: pause/resume/cancel, contact edit, payments `/api/subscription-payments`, plate-style list (2026-11-12/15)
- [x] CSV import `POST /api/subscriptions/import`: leftovers, pause, notes, remaining meals, lat/lng pins (2026-11-12/15)
- [x] Opt-in subscription meals `is_subscription_included`, `/employee/meals/subscription` (2026-11-12)

### Not finished or unverified

- Plan pickers use `SUBSCRIPTION_PLANS` constants; `GET /api/subscription-plans` unused by UI.
- Pending: backend Postman/RLS run (`tests/SUBSCRIPTIONS_BACKEND_TESTCASE.md` referenced but missing), onboarding UI run, invite T5 + live bot checks, rates bot round-trip, delivery-area UI check.
- Tabby is a label only. Staff form sends `location: null`.

## Employee dashboard

### Finished

- [x] `/employee`: needs-attention `/api/nav-counts`, sales `/api/sales`, pipeline `/api/dashboard/pipeline`, map `/api/dashboard/map`
- [x] Orders board `/employee/orders`: filters, `PATCH /api/orders/[id]`, thermal print, POS link
- [x] POS `/employee/orders/pos` (`PosTerminal.tsx`): dine-in/pickup/delivery via `/api/orders`
- [x] Accounts CRUD `/employee/accounts` (`/api/accounts`). Customers list `/employee/customers` (`/api/customers`)
- [x] Meals CRUD `/employee/meals`, FatSecret search, nutrition stickers, ESC/POS over Web Bluetooth (`lib/thermal/*`)

### Not finished or unverified

- `/employee/deliveries` is mock (constants, local state only).
- `/employee/customers/[id]` is mock; list blanks phone/address; customers page not in nav.

## Chef

### Finished

- [x] `/employee/chef`: recipes, subscriptions, `/api/chef-schedules`, `/api/daily-standards`, `/api/plan-protein-credits`
- [x] Shared kitchen batch suggestion, `POST /api/chef-schedules/batch` (2026-11-12, `lib/chef/autoFill.ts`)
- [x] Chicken-first, occasional seafood (2026-11-13, `lib/chef/categories.ts`)
- [x] Protein credits, remaining meals, pause/depleted gating, breakfast extras (`20261112010000_chef_schedule_entitlement.sql`). Honors food restrictions.

### Not finished or unverified

- Migrations applied live.
- `CHEF_SCHEDULES_TESTCASE.md` re-run after Nov 12-13.

## Rider

### Finished

- [x] `/rider`: open orders `GET /api/orders?status=ready_for_pickup`, mine `GET /api/deliveries/mine`
- [x] Take `POST /api/orders/[id]/assign`; complete with 6-digit code `PATCH /api/orders/[id]/assign`
- [x] GPS to `/api/riders/location` (`RiderMap`). Role guard in layout.

## Auth & roles

### Finished

- [x] Supabase Auth (`hooks/AuthProvider.tsx`, `lib/auth.ts`), role + `is_active` from `accounts`
- [x] `proxy.ts` protects `/employee`, `/rider`, `/customer`. Email/password login, redirect to `/${role}`

### Not finished or unverified

- `POST /api/accounts` uses hardcoded password `temporary123`.
- `admin` used in APIs but not a nav role.
- RLS not verified.

## Customer area

### Not finished or unverified

- `/customer` and `/customer/profile` read mock constants; Save calls no API.
- FEATURES items (credits, weekly edits, cutoffs, self-serve schedule) not built.

## Notifications

### Finished

- [x] Navbar bell `GET/PATCH /api/notifications`, unread badge, mark-all-read; nav-count badges
- [x] Web push (`public/sw.js`, VAPID, `lib/notifications/push.ts`) on new orders

### Not finished or unverified

- `20261025000000_notifications_mark_read.sql` applied.
- `NAVBAR_NOTIFICATIONS_TESTCASE.md` run.
- VAPID env.

## WhatsApp bot endpoints

### Finished

- [x] Reminders `/api/whatsapp-reminder`
- [x] Delivery lookup `/api/delivery/[id]`
- [x] Bot orders `POST /api/orders` with `x-bot-secret`
- [x] Invites, rates, renewals `/api/subscription-renewals`, `POST /api/subscription-non-renewal`

### Not finished or unverified

- No staff UI for the reminder queue.
- Live bot round-trips pending.

## Infra

### Finished

- [x] Next.js 16.2.10, TypeScript, Tailwind v4, Supabase SSR, next-intl, Mapbox, SWR
- [x] `app/manifest.ts`
- [x] Migrations 2026-09-04 to 2026-11-12 in repo

### Not finished or unverified

- Migrations applied on live Supabase (`order_origin_delivered_at`, `notifications_mark_read` were pending).
- Capacitor app in `MOBILE_APP.md` is plan only.
