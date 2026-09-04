# Orders Push Notifications — Testcase (Phase 1, employees only)

Scope: `POST /api/orders` + `PATCH /api/orders/[id]` trigger role-based push to `accounts.role = 'employee'`.

## P1 — New order triggers employee push
- Action: `POST /api/orders` valid body (201).
- Expect: order created; `notifications` rows inserted (one per employee recipient); subscribed employee browsers receive push `order_inquiry_created`; API still 201 if push fails.

## P2 — Validation failure sends nothing
- Action: `POST /api/orders` missing name/items (400).
- Expect: no `notifications` rows, no push attempt.

## S1 — Status change triggers push
- Action: `PATCH /api/orders/[id]` `{status: confirmed|preparing|out_for_delivery|delivered|cancelled}` (200).
- Expect: push `order_status_changed` to employees; `notifications` rows inserted.

## S2 — Invalid status sends nothing
- Action: `PATCH` invalid status (400) or unknown id (500).
- Expect: no push, no `notifications` rows.

## S3 — Role scoping
- Setup: subscriptions for employee + customer accounts.
- Action: trigger POST/PATCH.
- Expect: only employee `user_id`s get push + `notifications` rows; customer gets nothing.

## S4 — Subscription management
- `GET /api/notifications/vapid-key` returns public key.
- `POST /api/notifications/subscribe` upserts by endpoint (duplicate = single row).
- `DELETE /api/notifications/subscribe` removes by endpoint.
- Unauthenticated subscribe/delete = 401.

## S5 — Resilience
- Break push (bad VAPID / unreachable endpoint): order API still succeeds.
- Push provider 404/410: dead `push_subscriptions` row auto-deleted.

## S6 — SW click
- Click notification opens `data.url` (`/employee/deliveries` or order page).
