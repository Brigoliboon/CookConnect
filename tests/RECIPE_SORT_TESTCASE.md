# Recipe Sales Sort — Testcase

Scope: `GET /api/recipe?sort=sales|sales_desc` (optionally combined with `category`, `limit`, `offset`).
Rules under test: sales = units sold (`qty`) from `order_items` whose order is `delivered` **and** has `delivered_at`; figures are used for ordering only and never returned.

Run date: 2026-10-23 · `npx tsc --noEmit` clean · `npm run lint` = 50 problems (16 errors, 34 warnings, unchanged).

## U — Unit (stubbed DB, real `listRecipes` code)

- [x] **U1** `sort=sales_desc` ranks units descending: `r-m(12), r-a(5), r-b(0), r-z(0)`
- [x] **U2** `sort=sales` ranks units ascending, ties broken by `name.localeCompare`: `r-b, r-z, r-a, r-m`
- [x] **U3** sales query filters `orders.status = delivered`
- [x] **U4** sales query requires `orders.delivered_at IS NOT NULL`
- [x] **U5** items with `recipe_id = NULL` are skipped (qty 999 never attributed)
- [x] **U6** `category` still applied server-side (`eq` recorded on the recipes query)
- [x] **U7** `category` + sales never takes the SQL pagination path (`order`/`range` never called)
- [x] **U8** `category` + sales still sorts by units
- [x] **U9** `sort=name` issues no sales query
- [x] **U10** no `sort` issues no sales query
- [x] **U11** sort runs before `offset`/`limit` slicing (`limit=2&offset=1` → 2nd/3rd best sellers)
- [x] **U12** `total` is the pre-slice filtered count (4)
- [x] **U13–U17** response contains no `sales`, `units_sold`, `sales_qty`, `amount_cents`, `units`
- [x] **U18** recipe shape unchanged (`id`, `name`, `servings` present)
- [x] **U19** 19/19 assertions pass (`/tmp/opencode/test-recipe-sales.js`)

## V — Live HTTP (real endpoint, real DB)

- [x] **V1** `?sort=sales_desc` → 200
- [x] **V2** `?sort=sales` → 200
- [x] **V3** `?sort=sales_desc&category=pasta` → 200, `total=27`, every row `category=pasta`
- [x] **V4** `?sort=sales&limit=2` → 200 (pagination path with sales sort)
- [x] **V5** `?sort=bogus` → 400
- [x] **V6** recipe objects expose only `id,name,category,description,is_active,image_path,primary_protein_ingredient_id,servings` — no sales figure
- [x] **V7** cache headers unchanged: `cdn-cache-control: public, s-maxage=60…` + ETag present
- [x] **V8** sales SQL executes against prod without error (200, not 500)

## D — Data prerequisite (read-only prod probe)

- [ ] **D1** All 4 currently-delivered items have `recipe_id = NULL` (legacy, predate recipe linking) → every recipe ties at 0 today, so `sales_desc` renders name-ascending. Expected, not a bug.
- [ ] **D2** Recipe links exist going forward: all 4 cart components (`MealCard`, `CatalogMealCard`, `CategoryMealCard`, `GalleryCard`) send `recipeId`; recent POS orders carry valid `recipe_id` (13/13 valid references).
- [ ] **D3** Ordering becomes observable once a delivered order carries `recipe_id` — re-run U1/U2 against live data then.

## Known limitations

- `order_items.created_at` does not exist — sales attribution uses order status/date, never item timestamps.
- No recipe→sales fallback by item name (all delivered item names are legacy recipes absent from the 241-row menu).
