# Web Push Notifications — Orders-Scoped Implementation Plan (Phase 1)

## 0. Scope

Phase 1 triggers push **only** from `app/api/orders/`:

```text
POST  /api/orders      -> new order (status inquiry)
PATCH /api/orders/[id] -> status change (confirmed/preparing/out_for_delivery/delivered/cancelled)
GET   /api/orders*     -> never triggers push (read-only)
```

Later endpoints (deliveries, subscriptions, etc.) opt in by calling the same reusable service. No change to core infra needed.

Trigger rule per endpoint: **Supabase write succeeds first, then push as non-blocking side effect. Failed writes never push.**

## Target Architecture (unchanged)

```text
Next.js API Endpoint (orders)
        │ 1. Business operation
        ▼
   Supabase Database
        │ 2. Confirm successful write
        ▼
Next.js API continues
        │ 3. Trigger push (fire-and-forget)
        ▼
   Web Push Service (web-push + VAPID)
        ▼
    Service Worker -> Browser / OS Notification
```

No Supabase Database Webhook, no DB trigger, no Edge Function.

## 1. Trigger matrix (Phase 1)

| Endpoint | Success condition | Notification type | Recipients (Phase 1) | Message |
|---|---|---|---|---|
| `POST /api/orders` | `createOrder` returns order, status `inquiry` | `order_inquiry_created` | employees + admins (role broadcast) | New order `{name}` — `{itemCount} items, {total}` |
| `PATCH /api/orders/[id]` -> `confirmed` | `updateOrderStatus` succeeds | `order_status_changed` | employees + admins | Order `{id8}` confirmed |
| `PATCH` -> `preparing` | same | `order_status_changed` | employees + admins | Order `{id8}` preparing |
| `PATCH` -> `out_for_delivery` | same | `order_status_changed` | employees + admins (+ riders later) | Order `{id8}` out for delivery |
| `PATCH` -> `delivered` | same | `order_status_changed` | employees + admins | Order `{id8}` delivered |
| `PATCH` -> `cancelled` | same | `order_status_changed` | employees + admins | Order `{id8}` cancelled |

Why staff-only for now: `orders.customer_id` is nullable (guest checkout, see `sample_response.md`), so customer targeting is unreliable until auth/guest-linking is solved. Customer + rider targeting is Phase 2.

Payload (`data`) always includes `{ orderId, status, url: /employee/deliveries or /employee/accounts }` so `notificationclick` opens the right dashboard page.

## Step 1 — Install dependencies

```text
web-push
@types/web-push (dev)
```

`@supabase/supabase-js` and `@supabase/ssr` already in use. Browser uses native Notification / Push / Service Worker APIs.

## Step 2 — Configure VAPID

Generate VAPID public/private keys. Store:

```text
PUSH_VAPID_PUBLIC_KEY  (server + exposed to client via GET /api/notifications/vapid-key)
PUSH_VAPID_PRIVATE_KEY (server only, never to browser)
PUSH_VAPID_SUBJECT     (e.g. mailto:ops@example.com)
```

## Step 3 — Create `push_subscriptions`

```text
push_subscriptions (id, user_id -> accounts.id, endpoint UNIQUE, p256dh, auth, user_agent, created_at, updated_at)
```

One user = many rows (Chrome desktop, mobile, etc.). `endpoint` unique prevents duplicates. RLS: user manages own rows; server role reads rows for broadcast; employees/admins for Phase 1 broadcast use service-role client in push service only.

## Step 4 — Permission UX

Explicit "Enable notifications" button (e.g. employee Navbar/settings). Never auto-prompt on load. Flow: check support -> permission -> register SW -> subscribe.

## Step 5 — Service Worker `public/sw.js`

Handles `push` (show notification from payload `{title, body, data}`) and `notificationclick` (open `data.url`). Keep locale-agnostic; payload already contains en/ar strings.

## Step 6 — Browser subscription

`PushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey })` then `POST /api/notifications/subscribe`.

## Step 7 — Subscription APIs

```text
GET    /api/notifications/vapid-key  (returns public key)
POST   /api/notifications/subscribe  (auth, validate, upsert by endpoint)
DELETE /api/notifications/subscribe  (auth, delete by endpoint)
```

Strictly subscription management, no trigger logic.

## Step 8 — `notifications` table

```text
notifications (id, recipient_user_id -> accounts.id, type TEXT, title, body, data JSONB {orderId,status,url}, read_at NULL, created_at)
```

Types for Phase 1: `order_inquiry_created`, `order_status_changed`. `read_at` drives in-app state only; no delivery-status column in Phase 1.

## Step 9 — Reusable service (extensibility point)

```text
lib/notifications/types.ts  (NotificationType, OrderPayload, recipient resolution)
lib/notifications/push.ts   (sendToUserIds(), sendToRoles(['employee','admin']), cleanup 404/410)
lib/notifications/orders.ts (buildOrderCreated(), buildOrderStatusChanged() — bilingual title/body)
```

No endpoint imports `web-push` directly. Future endpoints add one `buildX()` + one call.

## Step 10 — Wire orders endpoints (the only Phase 1 triggers)

```text
POST /api/orders:
  createOrder -> success -> void notifyOrderCreated(order) -> return 201
  failure -> return 4xx/5xx, no push

PATCH /api/orders/[id]:
  updateOrderStatus -> success -> void notifyOrderStatusChanged(order) -> return 200
  failure/invalid status -> return 4xx/5xx, no push
```

Use fire-and-forget (`void promise.catch(log)` or `Promise.allSettled` without awaiting) so push latency never blocks the API response. Push failure never changes the API status code.

## Step 11 — Invalid subscriptions + preferences (deferred)

410/404 from push provider -> delete that `push_subscriptions` row. `notification_preferences` is Phase 2; Phase 1 always pushes to subscribed staff for the two order types.

## Step 12 — Test (orders only)

```text
POST success -> staff push received, click opens employee page
POST validation fail (missing name/items) -> no push
PATCH confirmed/preparing/out_for_delivery/delivered/cancelled -> matching push
PATCH invalid status/id -> no push
Push broken (bad VAPID) -> order still created (201), API unaffected
Duplicate subscribe same endpoint -> single row; unsubscribe -> row removed
Tab closed / browser restarted -> push still arrives
```

Demo: create order as customer/guest -> employee browser notification -> click -> correct order page.

## How to extend later

1. Add `buildX()` in `lib/notifications/`.
2. Call it after the new endpoint's successful Supabase write (same fire-and-forget pattern).
3. Add new `type` string + recipient set. No infra change.
