# CookConnect — Implementation Plan

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.10 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (via Supabase) — *not yet wired* |
| Auth | Supabase Auth — *not yet wired* |
| Maps | react-map-gl (Mapbox GL JS wrapper) |
| Animation | framer-motion |
| Backend | Next.js API Routes |
| Icons | lucide-react |
| i18n | next-intl v4 (routing + messages) — locales `en` / `ar` |

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `brand-900` | `#118B50` | Primary dark green (headers, buttons, nav, primary text) |
| `brand-700` | `#C0EBA6` | Light green (hover states, highlights) |
| `brand-400` | `#79AE6F` | Medium green (secondary accents, borders) |
| `surface` | `#f2f3f7` | Page background |
| `white` | `#ffffff` | Card/surface white |
| `black` | `#150d0b` | Near-black text alternative |
| `text-primary` | `var(--color-brand-900)` | Body text |
| `text-secondary` | `#4b5563` | Muted/text-secondary |
| `border` | `#d1d5db` | Default borders |
| `border-light` | `#e5e7eb` | Light borders |

---

## Route Structure (Actual)

```
app/
├── [locale]/                             # Public pages — locale-prefixed (en/ar, as-needed)
│   ├── layout.tsx                        # Root layout: <html lang/dir>, fonts, Providers, NextIntlClientProvider
│   ├── page.tsx                          # / — Landing page (en canonical at /, ar at /ar)
│   ├── login/page.tsx                    # /login — Quick-role buttons + email/password form
│   ├── terms/page.tsx                    # /terms — Service Agreement (message-driven)
│   └── privacy/page.tsx                  # /privacy — Privacy Policy (message-driven)
├── (authenticated)/                      # Protected — checks user role, mounts Navbar (root layout #2)
│   ├── layout.tsx                        # AuthProvider + AuthGuard + Navbar wrapper
│   ├── customer/
│   │   ├── page.tsx                      # /customer — Dashboard (stats, map image, meal plan)
│   │   └── profile/page.tsx              # /customer/profile — Edit profile
│   ├── employee/
│   │   ├── page.tsx                      # /employee — Dashboard (stats, map, quick actions, StatusGallery)
│   │   ├── customers/page.tsx            # /employee/customers — Table with search + status icons
│   │   ├── customers/[id]/page.tsx       # /employee/customers/[id] — Detail/edit
│   │   ├── subscriptions/page.tsx        # /employee/subscriptions — Gallery + create form (same page)
│   │   ├── deliveries/page.tsx           # /employee/deliveries — Map + inline edit table
│   │   └── accounts/page.tsx             # /employee/accounts — Table with filters + CSV export
│   └── rider/
│       └── page.tsx                      # /rider — Full-screen map + bottom sheet
├── sticker-preview/                      # Root layout #3 — minimal standalone page
│   └── page.tsx
├── proxy.ts                              # Middleware (Next 16): supabase auth + next-intl locale
└── globals.css                           # Tailwind v4 theme + base styles
```

## Components

### `components/ui/` (15 components)

| Component | Description |
|-----------|-------------|
| `Button` | Variants: primary/secondary/outline/ghost/danger; sizes: sm/md/lg |
| `Input` | Text input with optional label + error |
| `Select` | Native select with options array, label, error |
| `Card` | Wrapper with optional title |
| `Badge` | Variants: success/warning/error/info |
| `Modal` | Overlay modal with open/onClose/title/children |
| `Table` | Generic `<T>` with columns + data + onRowClick |
| `StatCard` | Icon + label + value display card |
| `DeliveryStatusItem` | Single delivery row with intent badge |
| `StatusGallery` | Paginated delivery gallery with search + intent filter |
| `ConfirmDialog` | Confirmation modal with confirm/cancel |
| `SubscriptionGallery` | Paginated subscription list with search + delete |
| `RiderMap` | Full-screen Mapbox map with GPS tracking, custom markers, popup actions, legend, style switcher |
| `MapboxMap` | Reusable Mapbox map with custom markers, legend, style switcher, popups |
| `LocationDialog` | Modal with Mapbox map + draggable marker for location picking |

### `components/layout/` (1 component)

| Component | Description |
|-----------|-------------|
| `Navbar` | Responsive nav with role-based links, hamburger menu on mobile, sign out |

## Hooks

| File | Exports |
|------|---------|
| `hooks/AuthProvider.tsx` | `AuthProvider` (default), `useAuth()` → `{ user, loading, signIn, signOut }` |

**Current state:** Mock user hardcoded as rider `R-001` (Kevin Ramos). Change `role` in AuthProvider line 27 to test employee or customer. `signIn` is a stub. `signOut` clears user to null.

## Constants

| File | Key Types | Key Data |
|------|-----------|----------|
| `customers.ts` | `Customer` | `CUSTOMERS` (6), `CUSTOMER_STATUS_OPTIONS` |
| `subscriptions.ts` | `Subscription`, `MealPlanDetail` | `SUBSCRIPTIONS` (5) |
| `deliveries.ts` | `Delivery`, `DeliveryIntent` | `DELIVERIES` (6), `RIDERS` (3), `DELIVERY_INTENT_OPTIONS` |
| `navigation.ts` | `NavItem`, `UserRole` | `NAV_ITEMS` per role |
| `accounts.ts` | `Account` | `ACCOUNTS` (10), `ROLE_OPTIONS` |

**All data is static — no API layer, no database.**

---

## Module Breakdown & Status

### Module 1: Project Scaffolding & Configuration — ✅ Complete

- Tailwind v4 theme with green palette — done
- Environment variables (`.env.local`) — done
- AuthProvider with mocked user — done
- Authenticated layout with role-based guards — done
- Shared Navbar — done
- `lib/` directory — **not created; empty**

### Module 2: Database Schema & Supabase Setup — ⏳ Partially Done

- Schema documented in `docs/database-schema.md` — done
- Supabase project — **not created**
- RLS policies — documented only
- Tables created — **not done**

### Module 3: Authentication (Supabase Auth) — ⏳ Partially Done

- Login page UI with quick-role buttons + email form — done
- AuthProvider wired to Supabase — **not done** (stub signIn/signOut)
- Session persistence — **not done**
- Role-based redirects — done (client-side in AuthGuard)

### Module 4: Employee Module — ✅ UI Complete (no API)

- `/employee` dashboard with stats, map, StatusGallery — done
- `/employee/customers` table with search, icons — done
- `/employee/customers/[id]` detail/edit page — done
- `/employee/subscriptions` gallery + create form — done
- `/employee/deliveries` map + inline edit table — done
- `/employee/accounts` table with filters + CSV export — done
- API routes — **not created**

### Module 5: Customer Module — ✅ UI Complete (no API)

- `/customer` dashboard with stats, map image, LocationDialog — done
- `/customer/profile` edit page — done
- `/customer/location` — **removed** (merged into dashboard)
- API routes — **not created**

### Module 6: Rider Module — ✅ UI Complete (no API)

- `/rider` dashboard with full-screen RiderMap, bottom sheet — done
- GPS tracking via `navigator.geolocation.watchPosition` — done
- Popup done/skip actions — done
- Legend + style switcher — done
- API routes — **not created**

### Module 7: Shared UI Components — ✅ Complete

All 15 UI components + Navbar built and used across modules.

### Module 8: Subscription Plans & Subscriptions (Backend) — ⏳ In Progress

Schema already deployed (`lib/supabase/models.ts` is the source of truth). Verified live: `subscription_plans` + `subscriptions` columns match models. RLS: customers read active plans + own subscriptions; employees/admins manage; customers cannot write. Exclusion constraint prevents overlapping entitlement windows per customer.

- `subscription_plans`: name, validity_days, price_cents, currency, details, is_active
- `subscriptions.customer_id` → `accounts.id` (user link), `subscriptions.subscription_plan_id` → `subscription_plans.id`
- status `active`/`cancelled`, `started_at`/`expires_at`/`cancelled_at`
- Flow: customer views plans → inquiry (table not created yet) → sales creates subscription

Checkpoint (all must pass before marking complete):
- [x] `lib/supabase/tables/subscription_plans.ts` — `listActivePlans`
- [x] `lib/supabase/tables/subscriptions.ts` — `listSubscriptions`, `listSubscriptionsForCustomer`, `getSubscription`, `createSubscription` (computes `expires_at` from plan `validity_days`), `cancelSubscription`
- [x] `app/api/subscription-plans/route.ts` — GET active plans
- [x] `app/api/subscriptions/route.ts` — GET list, POST create (maps exclusion/unique violations → 409)
- [x] `app/api/subscriptions/[id]/route.ts` — PATCH cancel (DELETE removed; no hard-delete)
- [x] Testcase file: `tests/SUBSCRIPTIONS_BACKEND_TESTCASE.md` (+ Postman collection)
- [x] Lint + typecheck pass
- [ ] **Pending:** Postman verification of `tests/SUBSCRIPTIONS_BACKEND_TESTCASE.md` (P1–P2, S1–S7) + RLS checks across customer/employee/anonymous sessions

### Module 9: Public Landing — Arabic (i18n) — ✅ Complete

- next-intl v4 wiring: `i18n/routing.ts` (locales en/ar, `as-needed` prefix), `i18n/navigation.ts` (locale-aware Link/useRouter), `i18n/request.ts` (getRequestConfig + hasLocale fallback), `next.config.ts` via `createNextIntlPlugin`
- `proxy.ts` merges supabase auth middleware with `createMiddleware(routing)` (Next 16 renamed middleware → proxy)
- Three root layouts: `app/[locale]` (public), `app/(authenticated)` (dashboards), `app/sticker-preview`
- `messages/en.json` + `messages/ar.json` namespaces: meta, nav, hero, featured, healthy, subscription, about, contact, footer, cart, gallery, meals, login, terms, privacy, lang
- `lib/fonts.ts` + `globals.css`: Cairo font for Arabic; RTL font-variable swap via `html[dir="rtl"]`
- `constants/translations.ts`: `AR_CONTENT` dictionary + `translateContent(text, locale)` for menu/category/plan data (English fallback; DB bilingual columns deferred)
- Landing components converted to `useTranslations`: Nav (+language toggle), CartButton, Hero, Footer, Contact, AboutUs, Subscription, MealCard, CartDialog, HealthyCampaign, FeaturedMeals, FeaturedSection, MealsDisplay, DrinkCard, GalleryCard, PremiumGallery
- Hero copy (`messages/*/hero` + `Hero.tsx`) covers dine-in, delivery/pickup and meal plans — not subscription-only; primary CTA → `#meals`, secondary → `#subscription`
- Pages converted: `[locale]/page`, `[locale]/login`, `[locale]/terms`, `[locale]/privacy` (legal content message-driven)
- English canonical at `/`; Arabic at `/ar/*` — no `/en` prefix in URLs
- Checkpoints: `npx tsc --noEmit` clean; `eslint` no errors on converted files; `npm run build` SSG for `/`, `/en/*`, `/ar/*`; auth dashboards unchanged

---

## Key Decisions

- Dashboard lives at root route per role (`/employee`, `/rider`, `/customer`) — no nested `/dashboard`
- Single `profiles` table with `role` enum — no separate tables per role
- JSONB `details` column for subscriptions — flexible schema
- Subscriptions create form on same page as list — not a separate route
- Customer location managed via LocationDialog on dashboard — dedicated `/customer/location` page removed
- Rider location tracking uses browser Geolocation API (`watchPosition` + high accuracy)
- Table uses unconstrained generic `<T>` with internal casting for interface flexibility
- Login page has quick-role buttons for development/testing
- next-intl over manual i18n; `as-needed` prefix keeps English canonical at `/` (Arabic only at `/ar`)
- Menu/category/plan content translated via `AR_CONTENT` dictionary + fallback instead of DB columns (bilingual admin UI = future module)
- Cairo font loaded once; RTL font-variable swap in CSS instead of per-locale font loading

---

### Module 10: SEO & Internet Presence — ✅ Complete

Domain `https://cookconnectae.com/` — en canonical at `/`, ar at `/ar`. GSC verified via DNS (owner-managed, no meta tag).

- `lib/seo.ts` — single source: SITE_URL, SITE_META en/ar, NAP, GEO (25.3969036,55.5220053), SOCIALS (IG/FB/WA), JSON-LD builders
- `app/robots.ts` — allow `/`, disallow `/api/`, `/customer`, `/employee/`, `/rider`, `/sticker-preview`; sitemap + host
- `app/sitemap.ts` — `/`, `/menu`, `/terms`, `/privacy` + `/ar` variants with hreflang alternates; excludes login/tracking/auth
- `app/manifest.ts` — CookConnect PWA manifest, theme `#118B50`
- `app/[locale]/layout.tsx` — `generateMetadata`: metadataBase, title template, OG, Twitter (locale-specific image via `ogImage(locale)`: `/ogg-banner_en.png` / `/ogg-banner_ar.png`), canonical + hreflang en/ar/x-default, geo (`AE-AJ`, Ajman, ICBM), viewport themeColor
- `app/[locale]/page.tsx` — `Restaurant` + `WebSite` JSON-LD via `components/seo/RestaurantJsonLd.tsx`
- `app/[locale]/menu/` (renamed from `catalog/`; 308 redirects `/catalog*`, `/en/catalog*`, `/ar/catalog*` → `/menu*` + `/menu.php` → `/menu` in `next.config.ts`; SSR: server `page.tsx` fetches first 24 via `listRecipes()` + passes to `MenuClient.tsx`, `ItemList` + `OrderAction` JSON-LD; route now dynamic)
- `app/[locale]/menu/[category]/` — 10 SSR category pages (meals/salad/rice-sides/platters/pasta/wraps/pizza/burgers/desserts/drinks) with H1, canonical + hreflang, `ItemList`; empty → noindex; in sitemap (0.7); linked from `/menu` pills (locale-aware `Link`, client filter preserved); shared mapper `lib/menu-map.ts`
- Subtree layouts: `menu`/`terms`/`privacy` indexable with canonical; `login`/`order-tracking` + `(authenticated)` → `noindex`
- `components/landing/Footer.tsx` — NAP unified to Ajman address, tel/mailto links, social links, `<address>` tag (fixed Dubai mismatch)
- `proxy.ts` — matcher bypasses `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `sw.js`
- Checkpoint: `tests/SEO_TESTCASE.md` (T1–T8)

---

### Module 11: Sales Tracking & Order Origin — ⏳ In Progress

Orders are tagged with their channel and sales are reportable without a ledger table.

- `orders.origin` — `web` | `pos` | `whatsapp`, set by the server (bot `x-bot-secret` header → whatsapp, `/employee/` referer → pos, admin/employee session without referer → pos, otherwise web). Never taken from the request body. Historical rows: `address = 'Dine-in'` → `pos`, all others → `web`
- `orders.delivered_at` — set by a DB trigger when status reaches `delivered`, cleared if the order moves away from it. Needed because `order_deliveries.delivered_at` is rider-only RLS and staff cannot read it
- Sales rules: orders count only at `delivered`, per order-item (`unit_price_cents × qty`) with delivery fees reported separately; subscriptions count per `subscription_payments` row (partial payments included)
- Dates are UAE (`Asia/Dubai`) days; totals are grouped by currency so AED orders never mix with another plan currency
- Reporting is derived from existing tables at read time — no `sales` table, no backfill ledger
- `GET /api/recipe` accepts `sort=sales` / `sort=sales_desc` (units sold, delivered orders only) and composes with `category`, `limit`, `offset`. Units are loaded only when a sales sort is requested; ordering happens in memory with a `name` tie-break. The response is sort-only — no sales figure is exposed on the publicly cached menu endpoint
- `GET /api/orders` accepts `?status=`, `?origin=`, `?location_only=true`, `?phone=` (partial, case-insensitive match on `mobile_number`), `?limit=` (positive integer) — all composable; response is the order list, newest first
- `POST /api/orders` is server-authoritative: `items[]` carries only `recipe_id` (required), `addon_recipe_id`, `qty` (int 1–100), `note`. Name/image snapshot from `recipes`, price from `servings`/`recipe_addons` (`resolveMealPrice`), subtotal/VAT recomputed server-side. Unknown/inactive recipe, invalid side, or bad qty → `400` (`OrderInputError`); client-sent price/name/image fields are ignored. Null-recipe items are rejected. Legacy rows keep their stored snapshots

Checkpoint (all must pass before marking complete):
- [x] Superseded draft migrations deleted (`20261022000001_recipe_sales_stats.sql`, `20261022000002_sales_rpc.sql`)
- [x] Testcase file: `tests/SALES_TRACKING_TESTCASE.md` (M1–M4, O1–O6, S1–S10)
- [x] Migration: `20261023000000_order_origin_delivered_at.sql` — `orders.origin`, `orders.delivered_at`, trigger, index, backfill, draft cleanup
- [x] `lib/supabase/models.ts` — `OrderOrigin`, `Order.origin`, `Order.delivered_at`
- [x] `lib/orders/origin.ts` — `inferOrderOrigin`
- [x] `lib/supabase/tables/orders.ts` — `CreateOrderInput.origin`, `createOrder` stores it, `listOrders` filters by it
- [x] `app/api/orders/route.ts` — POST infers origin, GET accepts `?origin=`
- [x] GET `?phone=` + `?limit=` filters (`lib/supabase/tables/orders.ts` `listOrders`, route validation)
- [x] Trimmed POST payload — `CreateOrderItemInput` = `recipe_id`/`addon_recipe_id`/`qty`/`note`; `createOrder` validates recipe + qty and snapshots name/image/price from DB; `OrderInputError` → 400; callers trimmed (`components/landing/CartDialog.tsx`, `app/(authenticated)/employee/orders/page.tsx`)
- [x] Verified live: spoofed `name`/`unit_price_cents`/`image_path` ignored (DB values stored), 400s for unknown recipe / missing recipe_id / qty 0 / bad addon / empty items, GET `phone`+`limit` filters work; `npx tsc --noEmit` clean, eslint 0 errors
- [x] `lib/supabase/tables/sales.ts` — `getSalesSummary`
- [x] `app/api/sales/route.ts` — staff-only `GET` (401 unauthenticated, 403 non-staff)
- [x] `chatbot/whatsapp-system-context.xml` — bot instructed to send `x-bot-secret`
- [x] `npx tsc --noEmit` clean; `eslint` unchanged at 16 pre-existing errors (0 new)
- [x] `RecipeSort` + route `SORTS` gained `sales` / `sales_desc` (`lib/supabase/tables/recipes.ts`, `app/api/recipe/route.ts`)
- [x] `sortRecipes` handles sales explicitly with a name tie-break (not the price fallthrough); `loadUnitsSold` queries delivered ⋈ `order_items` only for sales sorts
- [x] Testcase file: `tests/RECIPE_SORT_TESTCASE.md` (U1–U19, V1–V8, D1–D3)
- [ ] **Pending:** D3 — re-verify live ordering once a delivered order carries `recipe_id` (all 4 delivered items today predate recipe linking → every recipe ties at 0)
- [x] Showcase top sellers — server-side function (no RPC; sales stay a single read-time definition) returning **1 recipe per category** in one response for `beef, seafood, wrap, pizza`
- [x] Testcase file: `tests/SHOWCASE_TOP_SELLERS_TESTCASE.md` (C1–C10, U1–U8, L1–L5, D1–D2)
- [x] `getTopSellersByCategory` in `lib/supabase/tables/recipes.ts` — 2 queries total (recipes by category, units once), active-only, units desc + name tie-break via shared `sortRecipes`, `recipe: null` for empty categories
- [x] `app/api/showcase/route.ts` — public `GET`, `?categories=` (defaults to the 4 above), 400 on empty / >20 entries / entry >64 chars, never guesses aliases (`wrap` ≠ `wraps`)
- [x] `utils/httpCache.ts` — `etaggedJson` + cache headers shared by `/api/recipe` and `/api/showcase` (one definition, no drift); `/api/recipe` re-verified 200 → 304 after the extraction
- [x] `npx tsc --noEmit` clean; `eslint` unchanged (0 new); 18 showcase + 19 recipe-sort unit assertions pass; live C/U/L checks pass
- [ ] **Pending:** D1/D2 — showcase winner is name-ordered until a delivered order carries `recipe_id` (same root cause as D3 above)
- [x] `hooks/useShowcase.ts` + `components/landing/Hero.tsx` — hero row renders the 4 winners via shared `toMenuItem`; hardcoded `featured` fallback removed so no stale/fake dish is ever shown (row is empty until the fetch resolves)
- [ ] **Pending:** H5 — manual browser check of the hero swap (no browser automation in this environment)
- [x] Pure-logic checks: `inferOrderOrigin` (10 cases) + `validateSalesRange` (6 cases) + UAE day boundaries
- [ ] **Pending:** apply `20261023000000_order_origin_delivered_at.sql` to Supabase, then run `tests/SALES_TRACKING_TESTCASE.md` (M1–M4, O1–O6, S1–S10)

---

## Gaps / Next Steps

1. **Supabase Auth** — wire signIn/signOut, session management, role-based redirects
2. **API Routes** — create REST endpoints under `app/api/` (most exist now; wire remaining dashboards)
3. **Database** — create Supabase project, run schema migrations (deployed live for subscriptions/servings/orders)
4. **Replace mock data** — connect remaining pages to API layer
5. **Test files** — create testcase files per module (module testcases exist for subscriptions backend)
6. **`lib/` directory** — Supabase client/server helpers (`lib/supabase/...`)
7. **Middleware** — server-side route protection ✅ (via `proxy.ts`)
8. **Update IMPLEMENTATION.md** — keep in sync with actual route structure ✅
9. **Bilingual DB columns** (`name_ar`, `description_ar`, ...) + bilingual admin UI — separate future module (currently via `AR_CONTENT` dictionary)

---

## Design System Principles

- Fresh, natural, organic feel reflecting the green palette
- Clean and minimal — no `max-w-*` constraints; minimize Card usage
- Mobile-responsive (customers/riders may use phones)
- Accessible contrast ratios
- Consistent spacing, typography, and border radius
- framer-motion animations for page transitions, stat counters, list items
- Lucide icons throughout
- No emojis unless explicitly requested
