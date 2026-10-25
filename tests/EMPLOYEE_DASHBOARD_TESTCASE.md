# Employee Dashboard — Testcase

Scope: `/employee` stat cards and data wiring.

## D1 — Stat cards
- Dashboard shows four cards: Pending Orders, Pending Subscriptions, Ready for Pickup, Out for Delivery.
- Each card displays a numeric value (default `0` while loading or on fetch failure).

## D2 — Pending Orders
- Value equals the number of `orders.status = inquiry`.
- Creating a new order increments the card after reload.

## D3 — Pending Subscriptions
- Value equals `GET /api/nav-counts` → `subscriptions` (unapproved `subscription_inquiries`).
- Approving or declining an inquiry decrements the card after reload.

## D4 — Pickup and delivery
- Ready for Pickup equals `orders.status = ready_for_pickup`.
- Out for Delivery equals `orders.status = out_for_delivery`.
- Neither card counts cancelled or delivered orders.

## D5 — Map
- Delivery map still shows only `confirmed` orders with a location.
- Cards remain independent of the map query.

## D6 — Resilience
- If `/api/nav-counts` fails, Pending Subscriptions shows `0` and the rest of the dashboard still renders.
- No uncaught errors in the console for failed fetches.
