# Navbar Notification Badge — Testcase

Scope: `GET /api/notifications`, `PATCH /api/notifications`, and the employee Navbar bell/badge.

## N1 — Authentication
- `GET /api/notifications` without a session → `401`.
- `PATCH /api/notifications` without a session → `401`.

## N2 — Feed and unread count
- Authenticated request returns `{ notifications, unreadCount }`.
- Only rows where `recipient_user_id = auth.uid()` are returned.
- Notifications are newest first, capped by `?limit=` (default 20, 1–50).
- Invalid limit (`0`, `51`, `abc`) → `400`.
- `unreadCount` equals all unread rows for the user, including rows beyond the returned page.

## N3 — Mark selected as read
- `PATCH { ids: [...] }` sets `read_at` only on the caller's unread rows.
- Response `{ updated }` matches the number of rows changed.
- Another user's notification id in `ids` is not modified.
- Missing `ids` and `all` → `400`; invalid ids → `400`.

## N4 — Mark all as read
- `PATCH { all: true }` sets `read_at` on every unread row for the caller.
- `unreadCount` is `0` on the next `GET`.

## N5 — Navbar badge
- Employee with unread notifications sees a red count bubble on the bell.
- Count above 99 renders `99+`.
- No bubble when `unreadCount` is `0`.
- Badge refreshes within 30s, on window focus, and on tab visibility.
- Non-employee roles do not see the bell.

## N6 — Notification panel
- Clicking the bell opens the dropdown; clicking outside or pressing Escape closes it.
- Empty feed shows the “No notifications yet” state.
- Clicking an unread notification marks it read and navigates to `data.url` when present.
- “Mark all read” clears the badge and unread row styling.

## N7 — Push toggle
- The push enable/disable control still works from inside the panel footer.
- Toggle state reflects the device's existing push subscription.

## N8 — Pending nav counts
- `GET /api/nav-counts` unauthenticated → `401`; non-staff → `403`.
- `orders` equals the number of `orders.status = inquiry` rows.
- `subscriptions` equals the number of unapproved `subscription_inquiries` rows.
- Employee Navbar shows a red badge next to Orders and Subscriptions only when each count is above 0.
- Counts above 99 render `99+`.
- Badges refresh within 30s, on window focus, and on tab visibility.
- Badges are shown in both the desktop nav and the mobile menu.
