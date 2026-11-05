## Employee (ops/admin + managing customers + meals)

Auth/role

- Sign in / manage accounts with `employee` role
- CRUD/manage: create customer accounts (if you want employee “create account” for them)

Subscriptions & customers

- Create subscription on behalf of a customer
- View customer list + subscription status
- Cancel subscription
- View customer “meals left / credits” and restrictions (read-only for employee)

Recipes / meals (chef focused + supply focused)

- Add/edit recipes (proteins, carbs, light meals) and ingredient amounts
- Enable/disable recipes (availability)
- Edit meal-to-recipe generation rules (ratios, rotation settings) — or do this via dashboard/config

Daily operations

- Chef dashboard: “meals to prep today and timings” (printable)
- Supply dashboard: weekly rollups of ingredient usage + modifications (export to Excel)

Deliveries coordination

- Delivery dashboard:
    - change delivery time & location for a specific delivery “today”
    - manage delivery statuses (scheduled → preparing → delivered/cancelled)
- Packaging/dashboard: label/QR generation per customer meal instance (once meals are generated)

---

## Customer (self-subscribe + customer dashboard)

Account & subscription

- Create account
- Self-subscribe / choose:
    - meal plan vs diet plan
    - duration (7/14/26/30)
    - plan variant (individual/family + family size)
    - delivery scheme (morning/night, days of week, etc.)
- Upload/enter diet plan details (height, weight, activity, bodyfat optional, goal, preference, restrictions)

Payment & confirmation

- Choose payment method (Bank transfer / COD / restaurant / Tabby)
- See payment status
- Trigger/confirm “terms accepted” and submit subscription request

Customer dashboard

- View:
    - remaining protein credits (e.g., Salmon 78 meals)
    - delivery schedule (this week/next week)
    - today’s meals (and nutritional info / photos depending on what you build)
- Edit:
    - delivery time/location for “today” (with your rule: only until cutoff)
    - weekly meal choices for allowed categories (and cannot exceed protein ratio caps)

Constraints & safety

- Enforce edit cutoff time (e.g., no edits within 2 hours before delivery of same day; after 7am cutoff for morning, 12pm for evening)

---

## Rider (delivery execution + routing support)

Core

- Sign in / `rider` role
- View assigned deliveries (or view deliveries available nearby if you don’t assign explicitly)
- See:
    - customer address (and map)
    - delivery slot timing window (morning/evening)
    - meal type info needed for pickup/packaging

Operational

- Confirm statuses:
    - “picked up”
    - “delivered”

Map

- Rider dashboard map view (based on delivery locations)

---

## Payment (billing + email status)

Since you have multiple payment options, you’ll likely need:

- Link payments to `subscriptions` (and optionally to an “invoice” concept)

Payment record

- Store `payment_method` (bank transfer / cash on delivery / pay at restaurant / Tabby installment / one-time)
- Store `amount`, `currency`, `status`:
    - pending, confirmed, failed, refunded

Confirmation email tracking

- Track “sent / pending” for each subscription:
    - `payment_emails.status`: not_sent/sent/pending
    - plus `sent_at`

Tabby integration (if used)

- Store Tabby reference / installment plan metadata
- Webhook handling (later) to move status from pending → confirmed when Tabby confirms

---

## WhatsApp subscription renewals (M3, bot issue #3)

Bot-only renewal endpoints. All require `x-bot-secret: $WHATSAPP_BOT_SECRET`
(matching the bot's `COOKCONNECT_BOT_SECRET`) and use the service-role client.

- `GET /api/subscription-renewals?days=3&limit=50` — active, unpaused
  subscriptions expiring within `days`. Returns customer phone, plan (including
  slug), expiry, and saved `preferences` (the subscription `details`). Rows
  already reminded for their current expiry are omitted.
- `PATCH /api/subscription-renewals/[id]` — marks the renewal reminder sent.
  Body `{ "expires_at": "<subscription expiry>" }` records which expiry was
  reminded so the same expiry is not sent twice.
- `POST /api/subscription-non-renewal` — logs a non-renewal reason. Body
  `{ "phone": "9715...", "reason": "..." }` (or `subscription_id` instead of
  phone). It stores `non_renewal_reason` and `non_renewal_reason_at`.

Renewal invite links also carry the saved meal preferences in the signed token
(plan, meals/day, normal/flexible mode, restrictions, breakfast, selected
flexible meals, delivery days/slots, and on-call delivery). The onboarding form
pre-fills those values so the customer can keep or change them; contact and
address details are still entered on the form.

Migration: `supabase/migrations/20261027000000_subscription_renewals.sql`
adds `renewal_reminder_sent_at`, `renewal_reminder_expires_at`,
`non_renewal_reason`, and `non_renewal_reason_at` to `subscriptions`. Do not
run it against a remote database from this workspace.

Phone lookup normalisation uses `DEFAULT_COUNTRY_CODE` (default `971`) and the
subscription `details.mobile_number` or linked customer account number.
