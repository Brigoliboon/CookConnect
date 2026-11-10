# Sales Tracking + Order Origin — Testcase

Scope: every order is tagged with `origin` (`web` | `pos` | `whatsapp`); sales are reported through `GET /api/sales`. Orders count only at `delivered`, per order-item (+ delivery fees shown separately). Subscription sales count per payment taken.

## M1 — Migration applies cleanly
- Action: run the new migration on a copy of prod.
- Expect: `orders.origin` (default `web`, check constraint) and `orders.delivered_at` exist; trigger `trg_orders_delivered_at` present; index on `delivered_at` present.

## M2 — Migration is re-runnable
- Action: run the same migration twice.
- Expect: second run succeeds with no errors (no duplicate constraints, triggers, indexes).

## M3 — Backfill of historical rows
- Expect: orders with `address = 'Dine-in'` → `origin = 'pos'`; all other existing rows → `origin = 'web'`. Every order already `delivered` has a non-null `delivered_at` (from `order_deliveries.delivered_at`, else `orders.updated_at`).

## M4 — Superseded draft objects are gone
- Expect: no `public.sales` table, no `public.recipe_sales_stats` view, no `sales_sync_*` triggers/functions (whether or not the draft migration had ever been applied).

## O1 — Origin: web
- Action: `POST /api/orders` from the landing cart in a browser, no session.
- Expect: 201; order `origin = "web"`.

## O2 — Origin: pos
- Action: `POST /api/orders` with `referer` containing `/employee/`.
- Expect: 201; order `origin = "pos"`.

## O3 — Origin: whatsapp
- Action: `POST /api/orders` with header `x-bot-secret` equal to `WHATSAPP_BOT_SECRET`, any or no referer.
- Expect: 201; order `origin = "whatsapp"`.
- Action: same but with a wrong/absent key.
- Expect: falls back to the referer/role rules (not `whatsapp`).

## O4 — Origin fallback when there is no referer
- Action: `POST /api/orders` with no `referer`, no session → expect `origin = "web"`.
- Action: `POST /api/orders` with no `referer`, session of an admin/employee → expect `origin = "pos"`.

## O5 — Origin is stored, returned and filterable
- Action: `GET /api/orders?origin=pos` (also `web`, `whatsapp`).
- Expect: only rows with that origin; every row exposes `origin` and `delivered_at`.
- Action: `GET /api/orders?origin=phone` → 400.

## O6 — Origin cannot be spoofed from the body
- Action: `POST /api/orders` with `{"origin": "whatsapp"}` in the body and a normal browser referer.
- Expect: `origin = "web"` — the body field is ignored, only server signals decide.

## S1 — Delivered order is counted
- Setup: an order with items, status moved to `delivered`.
- Action: `GET /api/sales`.
- Expect: `totals_by_currency` shows `orders_count = 1` and `orders_cents` = Σ(`unit_price_cents × qty`); `by_origin` has a row for its origin; `by_recipe` has one row per dish with correct `qty`/`amount_cents`; `by_day` buckets it on the UAE date of `delivered_at`.

## S2 — Un-delivered orders never count
- Setup: orders in `inquiry`, `confirmed`, `preparing`, `ready_for_pickup`, `out_for_delivery`, `cancelled`.
- Action: `GET /api/sales`.
- Expect: none appear in `totals_by_currency`, `by_origin`, `by_day` or `by_recipe`.

## S3 — Un-delivering removes the sale
- Action: delivered order → `PATCH /api/orders/[id]` `{"status":"confirmed"}`.
- Expect: `delivered_at` becomes null and the sale disappears from `GET /api/sales`.
- Action: set it back to `delivered`.
- Expect: `delivered_at` set to a new timestamp and the sale reappears.

## S4 — Delivery fees are reported separately
- Setup: delivered order with `shipping_cents = 500`.
- Expect: `orders_cents` (dish lines only) excludes it; `delivery_fees_cents = 500`; `total_cents` includes it; `by_origin` and `by_day` also show `delivery_fees_cents`.

## S5 — Subscription sales = payments taken, partials included
- Setup: a subscription with a partial payment (e.g. 5000 of 20000) plus a second payment.
- Action: `GET /api/sales`.
- Expect: `subscription_cents` = Σ of all payments (not the plan price); `subscriptions_count` = number of payments; `by_plan` shows plan id/name/currency/amount; `by_day` buckets each payment on the UAE date of `paid_at`.

## S6 — Date range uses UAE days
- Action: `GET /api/sales?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Expect: only orders delivered and payments paid inside those two UAE days, inclusive. A payment at `YYYY-MM-DDT20:30:00Z` falls in the *next* UAE day.

## S7 — Invalid range rejected
- Action: `GET /api/sales?from=23-10-2026`, `?to=banana`, `?from=2026-10-22&to=2026-10-01`.
- Expect: 400 with a message. No params → full history.

## S8 — Staff only
- Action: `GET /api/sales` unauthenticated → 401; as `customer` or `rider` → 403; as `admin` or `employee` → 200.

## S9 — Currencies are never mixed
- Setup: orders in AED and a plan with a different currency.
- Expect: separate rows per currency in `totals_by_currency`, `by_origin` and `by_day`; no `total_cents` spans two currencies.

## S10 — Report survives a missing delivery row
- Setup: order with `status = 'delivered'` but its `order_deliveries` row deleted.
- Expect: the report still returns it (date comes from `orders.delivered_at`).
