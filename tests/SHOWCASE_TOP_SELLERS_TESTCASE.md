# Showcase Top Sellers — Testcase

Scope: `lib/supabase/tables/recipes.ts::getTopSellersByCategory` + `GET /api/showcase`.
Contract: **1 recipe per category** (user decision 2026-10-23), units sold from delivered ⋈ `order_items`, **figures never returned** (user decision: sort-only), single response covering all requested categories (user decision: server-side function, no RPC).

Requested today: `beef`, `seafood`, `wrap`, `pizza`.
Note: the DB stores `wrap`, not `wraps`. The endpoint is literal — it never guesses aliases.

## C — Contract

- [x] **C1** `GET /api/showcase` with no param defaults to `beef,seafood,wrap,pizza`
- [x] **C2** `GET /api/showcase?categories=beef,seafood,wrap,pizza` → 200 `{ data: [{ category, recipe }, …] }`, request order preserved
- [x] **C3** every requested category always yields an entry — unknown category ⇒ `recipe: null` (never a missing key)
- [x] **C4** `recipe` is the same shape `/api/recipe` returns (`id,name,category,description,is_active,image_path,primary_protein_ingredient_id,servings`)
- [x] **C5** no sales figure anywhere in the payload
- [x] **C6** duplicate categories are de-duplicated; first occurrence order kept
- [x] **C7** `categories=` (empty) → 400; more than 20 entries → 400; entry longer than 64 chars → 400
- [x] **C8** only `is_active` recipes are eligible (showcase must not link to a hidden menu item)
- [x] **C9** ETag + `CDN-Cache-Control: s-maxage=60` identical to `/api/recipe`; 304 on `If-None-Match`
- [x] **C10** unknown category does not 400/500 — it is data, not an error

## U — Unit (stubbed DB, real code)

- [x] **U1** two queries only: one `recipes … in(category)` + one `order_items` (units loaded once, not once per category)
- [x] **U2** units query filters `orders.status = delivered` and `delivered_at IS NOT NULL`
- [x] **U3** per category: highest units wins
- [x] **U4** ties broken by `name.localeCompare` (deterministic — all-zero data today)
- [x] **U5** `.eq("is_active", true)` applied
- [x] **U6** categories with no matching recipe → `recipe: null`
- [x] **U7** `null recipe_id` rows never attributed to any category
- [x] **U8** response order === request order even when DB returns groups differently

## L — Live (real endpoint, real DB)

- [x] **L1** default call 200, `data.length === 4`
- [x] **L2** explicit `?categories=beef,seafood` 200, `data.length === 2`
- [x] **L3** `?categories=` → 400, `?categories=` + 21 entries → 400
- [x] **L4** every `recipe` has `id` + `servings`; no `sales`/`units`/`qty` keys
- [x] **L5** `npx tsc --noEmit` clean; `npm run lint` no new errors (baseline 50 problems / 16 errors)

## H — Hero wiring (`components/landing/Hero.tsx`)

- [x] **H1** `hooks/useShowcase.ts` — SWR fetch of `/api/showcase`, same options as `useRecipes` (dedupe 30s, `revalidateOnFocus: false`)
- [x] **H2** cards built with `toMenuItem` (`lib/menu-map.ts`) so hero, `/menu` and category pages share one recipe→card mapping
- [x] **H3** hardcoded `featured` fallback removed (user decision) — the row renders nothing until `/api/showcase` resolves, so a fake/stale dish is never shown. The row animates at `delay: 0.8`, which normally covers the fetch.
- [x] **H4** `npx tsc --noEmit` clean; `npm run lint` unchanged; `/` renders 200 with no fallback dish names in the SSR HTML
- [ ] **H5** manual browser check: after hydration the hero shows the 4 winners (beef/seafood/wrap/pizza); before that the row is empty (no skeleton). No browser automation available in this environment — run in a browser.

## D — Data prerequisite (known, non-blocking)

- [ ] **D1** All delivered items today have `recipe_id = NULL` ⇒ every category ties at 0 ⇒ winner = name-ascending pick. The showcase is therefore **name-ordered until a delivered order carries a recipe_id**. Same caveat as `tests/RECIPE_SORT_TESTCASE.md` D1; both self-heal together.
- [ ] **D2** Re-run U3/U4 against live data once D1 clears.
