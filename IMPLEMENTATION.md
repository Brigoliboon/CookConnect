# Cook Connect Restaurant: Implementation checkpoints

Tracks build progress by milestone. See `REQUIREMENTS.md` for what each item means. Tick items as they're done, in the same pull request as the work.

**Repo layout**

- `app/`: Next.js App Router — public pages under `app/[locale]/`, staff dashboards under `app/(authenticated)/`, API routes under `app/api/`.
- `components/`, `lib/`, `hooks/`, `utils/`, `constants/`, `types/`: UI, domain logic, and shared helpers.
- `i18n/` and `messages/`: next-intl routing and English/Arabic copy.
- `supabase/migrations/`: schema changes, applied to the live Supabase project (T-9).
- `tests/`: manual test plans (markdown). There is no automated test runner in `package.json`.
- `docs/`: older working notes (schema, menu population, push, campaign). `REQUIREMENTS.md` and this file are the source of truth.

**Status (21 Nov 2026):** M1 to M8 are done on `main` at `e44d9de` (code audit of 2026-11-17; the app was not run). Remaining work is M9 to M15, in Boon's priority order: meals, ordering and subscribing, employee, rider, customer, then email and verification. The customer pages, `/employee/deliveries`, and `/employee/customers/[id]` are still mock. Open questions in `REQUIREMENTS.md`: Dubai delivery fee (code uses AED 200); FR-48 (whether 100 is AED or a count, and the drinks/cakes lists); FR-49 (which events send email, and who can enable it).

---

## M1: Foundation, auth, and hosting

- [x] Next.js 16 App Router, TypeScript, Tailwind v4 (T-1)
- [x] Supabase for database, auth, and storage (T-2)
- [x] next-intl with English and Arabic, RTL on Arabic public pages (T-3)
- [x] Mapbox for maps and delivery pins (T-4)
- [x] Hosted on Vercel at https://cook-connect-omega.vercel.app (T-5)
- [x] Email and password sign-in; roles employee, chef, rider, customer; inactive accounts blocked (FR-40)
- [x] `proxy.ts` protects `/employee`, `/rider`, and `/customer`, and skips i18n on those routes (FR-41)
- [x] Prices and VAT recalculated on the server (NFR-2, FR-9)
- [x] Schema changes live in `supabase/migrations/` (T-9). Applying them on the live project is still unverified (see M15).

## M2: Landing page and SEO (FR-1, FR-2, FR-3, FR-5)

- [x] English and Arabic landing pages with RTL layout and a language toggle (FR-1)
- [x] Hero with live top sellers, featured meals, healthy campaign, plan cards, about, contact map, and footer (FR-2)
- [x] SEO: metadata, sitemap, robots, OG images, JSON-LD, Google Analytics (FR-3)
- [x] Terms and privacy pages (FR-5)
- [x] Optimized AVIF/WebP images and cached API responses on public pages (NFR-1)

## M3: Menu and ordering (FR-6 to FR-10)

- [x] Menu with categories, subcategories, search, and sort (FR-6)
- [x] Add-ons and sides (FR-7)
- [x] Cart and checkout for delivery (map pin, Ajman only) or pickup, with consent (FR-8)
- [x] Server recalculates prices and VAT (VAT-inclusive) (FR-9, NFR-2)
- [x] Public order tracking by code with verification (FR-10)

## M4: Subscriptions (FR-12 to FR-21)

- [x] Six-step sign-up wizard: plan, details, preferences, meals, delivery, review (FR-12)
- [x] Inquiries that staff approve or reject (FR-13)
- [x] Signed invite links with a negotiated price, used by the WhatsApp bot (FR-14)
- [x] Rates by duration (6/15/20/26/30/45 days) and meals per day (1 to 5) from the backend (FR-15)
- [x] Delivery fees by area, charged per delivery: Ajman free, Sharjah AED 100 (confirmed 2026-11-21), Dubai AED 200 in code (still to confirm) (FR-16)
- [x] Food restrictions (ingredients and skipped categories) respected in meal selection and chef auto-fill (FR-17)
- [x] Staff can create a subscription for a customer (FR-18)
- [x] Staff can pause, resume, cancel, edit contact details, and record payments (FR-19)
- [x] CSV import of existing subscribers with preview (FR-20)
- [x] Staff choose which meals are available to subscribers (FR-21)

## M5: Employee dashboard (FR-23 to FR-27, FR-29)

- [x] Overview: needs-attention counts, sales, order pipeline, delivery map (FR-23)
- [x] Orders board with filters, status updates, and thermal receipt printing (FR-24, T-7)
- [x] POS for dine-in, pickup, and delivery (FR-25)
- [x] Staff account management (FR-26)
- [x] Customer list (FR-27)
- [x] Meal management with nutrition lookup and printed nutrition stickers (FR-29)
- [x] Staff dashboards usable on phones and tablets (NFR-3). Dashboards stay English only (resolved 2026-11-21).

## M6: Chef planning (FR-31, FR-32 done part, FR-33)

- [x] Daily cook schedules from subscriber entitlements: protein credits, remaining meals, paused or used-up subscriptions skipped, breakfast extras (FR-31)
- [x] Shared kitchen batch suggestion, chicken-first with occasional seafood (FR-32, built part)
- [x] Daily standards and plan protein credits (FR-33)

The chef page already filters the day's subscribers with `activeOn()`, which returns false when `details.onCall` is true, before it runs Suggest meals. See M9 for the FR-32 revision.

## M7: Rider (FR-34, FR-35, FR-36)

- [x] List of orders ready for pickup and the rider's own deliveries (FR-34)
- [x] Take an order and complete it with the customer's 6-digit code (FR-35)
- [x] Share live GPS location (FR-36)

## M8: Notifications and WhatsApp bot API (FR-43 to FR-46)

- [x] Notification bell with unread count and mark-all-read (FR-43)
- [x] Web push to staff on new orders (FR-44, T-8)
- [x] Bot can place orders, look up deliveries, create invites, and read rates, behind `x-bot-secret` (FR-45, T-6)
- [x] Renewal reminder 3 days before expiry, and recording why a customer didn't renew (FR-46)

---

## M9: Meals (FR-11, FR-32)

- [ ] Store Arabic meal names in the database instead of the `AR_CONTENT` dictionary in code (FR-11)
- [ ] Confirm meal suggestions exclude on-call-only subscriptions (FR-32 revision). Code already does this through `activeOn()` in `lib/chef/day.ts` and the chef page. There is no on-call flag on meals; on-call is a subscription delivery mode. Confirm this matches the intent in `REQUIREMENTS.md` (which currently says "on-call-only meals"). If it does, tick this item and tighten that wording.

## M10: Ordering and subscribing (FR-4, FR-22, FR-48)

- [ ] Plan cards (and any other plan pickers still on constants) read live plans from `GET /api/subscription-plans` instead of hardcoded `SUBSCRIPTION_PLANS` (FR-4)
- [ ] Staff subscription form saves the delivery location (it currently sends `location: null`) (FR-22)
- [ ] Subscribers can choose add-on inclusions: drinks (100) and cakes (100), each from an item list (FR-48)
- [ ] Resolve the open questions before building: is 100 a price in AED or an item count, and what is on each list?

## M11: Employee (FR-28, FR-30, FR-42, FR-47)

- [ ] Customer details page wired to the API (replace mock data), and a nav link to the customers page (FR-28)
- [ ] Deliveries page wired to the API (replace mock data): change today's time and location, manage statuses (FR-30)
- [ ] New staff accounts get a set-password or invite email instead of the fixed `temporary123` password in `POST /api/accounts` (FR-42)
- [ ] Staff view of the reminder and renewal queue (FR-47)

## M12: Rider

No open rider requirements; FR-34 to FR-36 are done in M7.

- [ ] Re-test the rider flow end to end (take an order, complete with the 6-digit code, live GPS) after M9 to M11 land

## M13: Customer area (FR-37, FR-38, FR-39)

In scope (confirmed 2026-11-21). Pages exist but read mock data.

- [ ] Customer dashboard: remaining meals and protein credits, delivery schedule, and today's meals (FR-37)
- [ ] Edit profile and save it (Save currently does nothing) (FR-38)
- [ ] Change today's delivery time or location before the cutoff (FR-39)

## M14: Email notifications (FR-49)

No email-sending code exists yet. The public site lists `cookconnectrestaurant@gmail.com` as the restaurant contact address. The staff invite email in M11 (FR-42) may reuse this Gmail setup.

- [ ] Email notifications from the restaurant's Gmail account to users who have email notifications enabled (FR-49)
- [ ] Choose Gmail SMTP with an App Password, or the Gmail API, and add the needed env vars (names only, never commit values)
- [ ] Resolve the open questions before building: which events send an email, and who can enable it?

## M15: Verification

These were unverified in the 2026-11-17 audit. Do not tick them from memory; confirm on the live project or by re-running the plan.

- [ ] Confirm every migration in `supabase/migrations/` is applied on the live Supabase project, especially `20261023000000_order_origin_delivered_at.sql` and `20261025000000_notifications_mark_read.sql`
- [ ] Check row-level security on Supabase tables so each role sees only its data
- [ ] Re-run the manual test plans in `tests/` that have not been run since the November changes, including chef schedules, navbar notifications, subscription onboarding, invites, and rates
- [ ] Restore or rewrite `tests/SUBSCRIPTIONS_BACKEND_TESTCASE.md` if it is still needed (referenced in older notes, missing from the repo), then run it
- [ ] Confirm production env vars on Vercel, including VAPID keys for web push
- [ ] Record the Dubai subscription delivery fee once Boon confirms AED 150 or AED 200 (code and FR-16 currently use 200)

---

## Progress log

Newest first. Times are Asia/Manila (UTC+8).

- 2026-11-21 22:27: Boon reordered the open milestones by priority: M9 Meals, M10 Ordering and subscribing, M11 Employee, M12 Rider (re-test only), M13 Customer area, M14 Email notifications, M15 Verification.
- 2026-11-21 22:01: Root docs drafted to match the SignalScape layout: `REQUIREMENTS.md` (FR-1 to FR-49, already approved in progress), this file, `AGENTS.md`, and `README.md`. Done work is grouped as M1 to M8 (ticked from the 2026-11-17 audit of `main` at `e44d9de`). Remaining work is M9 to M16. No references to `MOBILE_APP.md` or `FEATURES`. These drafts live in the vault until Boon approves putting them in the repo. [PR #4](https://github.com/Brigoliboon/CookConnect/pull/4) (`docs/root-cleanup`) is still open and is superseded by this draft.
- 2026-11-21: Requirements updated from Boon's answers: Sharjah AED 100; customer dashboard (FR-37 to FR-39) stays in scope; no Tabby or card payment; staff dashboards stay English only. FR-32 revised (exclude on-call from suggestions). Added FR-48 (drinks and cakes add-ons) and FR-49 (Gmail email notifications).
- 2026-11-17: Read-only code audit of `main` at `e44d9de`. Auth and Supabase are wired. Employee, chef, and rider areas are API-backed. Only the customer pages, `/employee/deliveries`, and `/employee/customers/[id]` are mock.
- 2026-11-15: Food restrictions landed on `main` (`e44d9de`) (FR-17).
