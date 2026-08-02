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
