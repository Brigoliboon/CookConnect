# Employee Dashboard — Testcase

Scope: `/employee` dashboard, fully wired to live data.

## M1 — Dashboard
- Dashboard shows the live badge.
- Range toggle switches between Today, 7 days, and 30 days.
- Sections render: Needs attention, Performance, Quick actions, Operations, Sales performance.

## M2 — Layout
- KPI cards are 2-up on mobile and 4-up on wide screens.
- Order pipeline spans the full content width.
- Revenue trend and origin split are side-by-side on wide screens.
- Delivery map and subscriber overview are side-by-side on wide screens.
- No horizontal overflow at mobile width.

## M3 — Collapsible sections
- Every section collapses and expands independently.
- Section content stays mounted and visible after re-expanding.
- Chevron rotates to reflect open/closed state.

## M4 — Visual states
- Positive deltas use green treatment; negative deltas use red.
- Origin legend colors match the donut segments.
- Pipeline shows active flow only (no Delivered stage) and segment widths match their counts.
- Subscriber status chips use distinct colors for Active, Expiring soon, Paused, Expired, and Cancelled.

## L0 — Needs attention
- Pending orders equals `GET /api/nav-counts` → `orders` (inquiry orders).
- Subscription inquiries equals `GET /api/nav-counts` → `subscriptions` (unapproved inquiries).
- Values show `—` while loading and update within 30s or on window focus.
- Zero counts show “No orders waiting” / “No inquiries waiting”.

## L1 — Order pipeline
- Pipeline counts come from `GET /api/dashboard/pipeline`.
- Inquiry, Confirmed, Preparing, Ready, and Out for delivery match current `orders.status` counts.
- Delivered and cancelled orders are excluded.
- Values show `—` while loading or on fetch failure.
- Counts refresh every 30s and on window focus.

## L2 — Performance
- Revenue equals `totals_by_currency.total_cents` (delivered order sales + delivery fees + subscription payments) from `/api/sales`.
- Orders equals delivered `orders_count` in range.
- AOV equals `orders_cents / orders_count`; shows two decimals.
- Revenue, Orders, and AOV deltas compare against the previous equal-length range.
- Active Subscriptions counts `status = active`, not paused, `expires_at > now`.
- The subscription hint shows how many active subscriptions renew within 7 days.
- Values show `—` while loading and refresh every 60s or on focus.
- Range buttons switch the `from`/`to` dates sent to `/api/sales`.

## L3 — Sales performance and operations
- Revenue trend comes from `by_day`, filled with zero-value days across the selected range.
- Origin split comes from `by_origin`; amount is order sales + delivery fees.
- Top meals come from `by_recipe`, top 5 by revenue.
- Top plans come from `by_plan`, top 5 by revenue.
- Delivery map comes from `GET /api/dashboard/map` (confirmed, preparing, ready pickup, out for delivery with a location).
- Subscriber overview comes from `GET /api/subscriptions` and shows up to 4 cards with name, plan, status, and expiry detail.
- Empty and loading states appear for every live panel.

## L4 — Resilience
- API failures show empty/error states without crashing.
- Multi-currency sales use one selected currency per view and do not mix totals.
