# Cook Connect Restaurant: Implementation checkpoints

Tracks build progress by milestone. See `REQUIREMENTS.md` for what each item means. Tick items as they're done, in the same pull request as the work.

**Repo layout**

- `app/`: Next.js App Router — public pages under `app/[locale]/`, staff dashboards under `app/(authenticated)/`, API routes under `app/api/`.
- `components/`, `lib/`, `hooks/`, `utils/`, `constants/`, `types/`: UI, domain logic, and shared helpers.
- `i18n/` and `messages/`: next-intl routing and English/Arabic copy.
- `supabase/migrations/`: schema changes, applied to the live Supabase project (T-9).
- `tests/`: manual test plans (markdown). There is no automated test runner in `package.json`.
- `docs/`: older working notes (schema, menu population, push, campaign). `REQUIREMENTS.md` and this file are the source of truth.

**Status (21 Nov 2026):** M1 to M8 are done on `main` at `e44d9de` (code audit of 2026-11-17; the app was not run). Remaining work is M9 to M15, in Boon's priority order: meals, ordering and subscribing, employee, rider, customer, then email and verification. The customer pages, `/employee/deliveries`, and `/employee/customers/[id]` are still mock. Open question in `REQUIREMENTS.md`: Dubai delivery fee (code uses AED 200). FR-48 is answered (AED 100 per add-on for the whole plan; one item per selected add-on type from the CSV lists). FR-49 is answered: emails go out on a new order and a new subscription inquiry, to staff who opt in.

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
- [x] Public and staff subscription forms offer drinks and cakes add-ons from the CSV lists; public copy is bilingual (FR-48)
- [x] Add-ons are stored in inquiry/subscription details, invite preferences, and optional CSV import columns (FR-48)
- [x] AED 100 per selected add-on is added to the approved or staff-created total on top of the negotiated plan price, once for the whole plan (FR-48)
- [x] Staff views, inquiry emails, and the chef cook sheet show chosen add-ons; each selected type schedules one item and does not consume meal credits (FR-48)
- [x] Resolve the open questions before building: AED 100 per add-on for the whole plan; one item per selected type from the POS menu matrix CSV; negotiated price covers only the plan (FR-48)

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

Sent from the restaurant Gmail account (`cookconnectrestaurant@gmail.com`) through Gmail SMTP with an App Password (`lib/notifications/email.ts`). The staff invite email in M11 (FR-42) may reuse this Gmail setup.

- [x] Email notifications from the restaurant's Gmail account to users who have email notifications enabled (FR-49)
- [x] Choose Gmail SMTP with an App Password, or the Gmail API, and add the needed env vars (names only, never commit values): `GMAIL_USER`, `GMAIL_APP_PASSWORD`, optional `EMAIL_FROM_NAME`
- [x] Resolve the open questions before building: which events send an email, and who can enable it? Answer: a new order and a new subscription inquiry; active employee accounts that turn on "Email notifications" (off by default)
- [ ] Apply `20261121000000_accounts_email_notifications.sql` to the live Supabase project and set the Gmail env vars on Vercel

## M15: Verification

These were unverified in the 2026-11-17 audit. Do not tick them from memory; confirm on the live project or by re-running the plan.

- [ ] Confirm every migration in `supabase/migrations/` is applied on the live Supabase project, especially `20261023000000_order_origin_delivered_at.sql` and `20261025000000_notifications_mark_read.sql`
- [ ] Check row-level security on Supabase tables so each role sees only its data
- [ ] Re-run the manual test plans in `tests/` that have not been run since the November changes, including chef schedules, navbar notifications, subscription onboarding, invites, and rates
- [ ] Restore or rewrite `tests/SUBSCRIPTIONS_BACKEND_TESTCASE.md` if it is still needed (referenced in older notes, missing from the repo), then run it
- [ ] Confirm production env vars on Vercel, including VAPID keys for web push
- [ ] Record the Dubai subscription delivery fee once Boon confirms AED 150 or AED 200 (code and FR-16 currently use 200)

## M16: Meal modifiers (FR-50)

Added 2026-11-24 at Boon's request. Reusable single-select required groups replace the experimental per-meal `recipe_addons` sides for regular orders, the cart, and POS. A group can be a side ("Choose your side") or any other pick-one choice such as spice level ("Spicy / Not spicy"). Option `recipe_id` is optional: set it for a side dish, leave it empty for a non-recipe choice. `price_cents` may be 0. Groups may be attached to meals that are also included in subscriptions; subscription and Chef flows ignore those groups and use the base meal with no add-ons. Regular cart and POS orders of the same meal still require a pick. Meal CSV is out of v1. FR-48 stays a separate open item.

Boon confirmed 2026-11-24: v1 is pick-one and required only; the order snapshot also stores the side recipe id and its Arabic name. He later clarified that subscription orders get no add-ons, but the same meal ordered normally (cart or POS) can have modifiers. Boon also confirmed that when a meal with attached groups is added to the cart or a POS order, a dialog should appear so the customer or staff can pick one option per group. That dialog is the next PR; this milestone's editor only manages and attaches groups.

- [x] Migration `20261124000000_meal_modifiers.sql`: tables, RLS, default-option swap trigger, and `create_order_with_modifiers` RPC (server-priced, VAT 5% of subtotal in AED cents). Boon applied this on the live Supabase project. `recipe_id` on options is already nullable.
- [ ] Follow-up migration `20261124010000_meal_modifiers_allow_subscription_meals.sql`: drops the triggers that blocked groups on subscription-included meals. Boon needs to run this on the Cook Connect Supabase project. `create_order_with_modifiers` is unchanged and is not used by subscription paths.
- [x] Employee API: public read of active groups/options; employee-only writes (including inactive rows). Checkout and POS still use the existing add-on path until the picker PR; they do not call the RPC yet.
- [x] Employee meal editor: manage groups/options and attach groups to any meal, including ones included in subscriptions. The old `recipe_addons` reads stay in place.
- [x] Customer menu, landing cart, and POS: a dialog appears when adding a meal that has attached groups, so the customer or staff picks one option per group (sides, spice level, or other modifiers). Catalog JSON includes `has_modifiers` so meals without groups add with no extra fetch; groups are prefetched on viewport/hover and the picker opens immediately (loading state inside the dialog if needed). Cart line key includes the chosen options. Checkout and POS then call `create_order_with_modifiers` with server-side pricing. Meals with no new groups still use the old `recipe_addons` path, and only when `has_addons` is true. Subscription flows are unchanged.
- [ ] Order details, staff email, thermal receipt, and public tracking show snapshotted modifier labels, plus a compatibility read of existing `order_item_addons` rows. The old add-on tables stay until a later follow-up migrates historical rows and drops them.
- [ ] Run `tests/MEAL_MODIFIERS_TESTCASE.md` and tick this milestone

---

## Progress log

Newest first. Times are Asia/Manila (UTC+8).

- 2026-11-25 16:45: FR-48 add-on scheduling no longer always picks the first item of each list. New `lib/chef/addons.ts` applies the chef variety rules to drinks and cakes (7-day and last-three recency per subscriber, least-recently-served rotation, one shared batch per day, restriction checks, saved add-ons kept). Wired into chef auto-fill and manual save. Add-on cards on the public and staff subscription forms now show the `/menu` Dirham sign with the price instead of a description. Updated the add-ons testcase (A1, B1, F7 to F12).

- 2026-11-25 16:07: FR-48 scheduling clarified on `feat/m10-subscription-addons`: each selected add-on type schedules exactly one item from its CSV list, so a subscriber with both add-ons gets at most two non-entitlement cook-sheet rows instead of the whole list. Updated public/staff copy, employee display, requirements, and testcase. Also seeded add-on names into the chef catalog so rows show names instead of truncated UUIDs.

- 2026-11-25 15:19: Subscription add-ons on `feat/m10-subscription-addons`: FR-48 drinks and cakes are fixed bundles from the POS menu matrix CSV, AED 100 each for the whole plan, added on top of the agreed plan price. Added bilingual public toggles and review rows, staff form, invite preferences, inquiry/approval/CSV fields, staff badges/email lines, server-side total enforcement, and chef cook-sheet extras that do not consume meal credits. No migration needed. `tests/SUBSCRIPTION_ADDONS_TESTCASE.md` added; `npm run build` passed and lint is at the existing 17 errors / 33 warnings baseline.

- 2026-11-25 13:18: SEO maintenance on `fix/seo-maintenance`: bilingual titles/descriptions, `www` canonical host, no doubled brand, OG/Twitter on every public page, menu/category H1s, 10 category links from the menu and footer, crawlable language switch, database-side category filtering with the noindex-on-failure fix, bilingual sitemap entries with fixed dates, square icons, compressed share images, JSON-LD nutrition guard, visible hero on first paint, and a branded localized 404. Section F (new meal-plan landing pages) is intentionally excluded. `npm run build` passed; lint still reports pre-existing errors outside these files. Production verification is still pending.

- 2026-11-24 04:10: Faster add-to-cart on `feat/meal-modifiers-picker`: `/api/recipe` and other catalog payloads now include `has_modifiers` (batched from active group links, not N+1). `has_addons` is unchanged and still comes from the old `recipe_addons` table. Meals with `has_modifiers: false` add with no modifier fetch; groups are prefetched when a card enters view or on hover/touch, and the picker opens immediately (loading state inside the dialog if the cache is still empty). Server-side pricing is unchanged.
- 2026-11-24 03:42: Meal modifier picker on `feat/meal-modifiers-picker`: adding a meal with attached groups opens a dialog (bottom sheet on phone) to pick one option per group, with the default preselected, add-on prices as +AED, and a live total. The same meal with different picks stays on separate cart/POS lines, and checkout/POS call `create_order_with_modifiers`. Meals without groups add directly; old `recipe_addons` remain as a fallback. Subscription flows are unchanged. Order details, email, receipt, and tracking are left for the next PR.
- 2026-11-24 03:02: Allow modifier groups on subscription-included meals on `fix/modifiers-on-subscription-meals`: removed the editor and API blocks, and added follow-up migration `20261124010000_meal_modifiers_allow_subscription_meals.sql` to drop the per-meal triggers. Subscription and Chef flows still ignore add-ons; cart and POS of the same meal still require a pick. Boon needs to run the new SQL.
- 2026-11-24 02:39: Employee meal-modifier editor on `feat/meal-modifiers-editor`: staff can create and edit reusable groups and options (EN/AR names, optional side recipe, add-on price in AED, default, active) under Meals → Modifiers, and attach groups on New Meal / Edit Meal. Attaching to subscription-included meals is blocked. The add-to-cart / POS picker dialog is left for the next PR. No new migration; option `recipe_id` is already nullable.
- 2026-11-24 02:24: Fixed the meal-modifier migration on `feat/meal-modifiers-schema`: removed `is_staff_account()` so role checks use only existing `user_role` values `'employee'` and `'admin'` (no `'chef'` or `'rider'`). Snapshot staff reads use `is_employee_or_admin()`. The script is safe to re-run (`if not exists` / `create or replace` / `drop … if exists`).
- 2026-11-24 02:13: Meal-modifier schema on `feat/meal-modifiers-schema`: FR-50, M16, the migration and the testcase aligned to Boon's v1 decisions (single-select required groups; subscriptions out of v1; snapshots include side `recipe_id` and `name_ar`). Adds `create_order_with_modifiers`, tighter RLS, and leaves `recipe_addons` in place. Docs and SQL only.
- 2026-11-23 23:43: Landing plan cards on `feat/landing-subscription-gallery`: on phones the plans are a snap gallery with the centered card at full scale, a peek of the neighbouring cards, invisible tap zones on both sides that slide to the previous/next plan, and dot navigation underneath; the Healthy plan is the initial focus (centered on load); the desktop grid is unchanged. `SUBSCRIPTION_PLANS` still backs the section (FR-2); FR-4 live plans remain open.
- 2026-11-22 18:36: Employee Subscriptions redesign on `feat/employee-subscriptions`: Active and Inquiries tabs with counts; one row per subscription (plan, days left, Renewal due soon from `expires_at`); details open in a side panel (bottom sheet on phone); pause, resume, cancel, payments, invite, CSV, and approve/decline kept. No new APIs or migrations.
- 2026-11-22 18:30: Employee Chef redesign on `feat/employee-chef`: week strip, To Cook Today stats and time-of-day tabs, amber Avoids chips, Still to pick shows 5 names plus Show all, and Done / Reopen all still use `chef_schedules.done_at` through `PATCH /api/chef-schedules`. No migration.
- 2026-11-22 18:10: Employee Meals redesign on `feat/employee-meals`: one row per meal with an enable switch and a ⋯ menu (view, edit, delete); category chips, search, and CSV tools kept; New Meal and existing recipe APIs unchanged (`is_active` already backed the toggle).
- 2026-11-22 17:45: Fix employee shell scrolling on `fix/shell-scroll`: the icon rail, header and phone tab bar stay locked to the viewport (`fixed inset-0 h-dvh overflow-hidden`); only the main content area scrolls.
- 2026-11-22 17:20: Employee Orders redesign on `feat/employee-orders`: status tabs Inquiry, Confirmed, Preparing, Ready, Completed and Cancelled with counts; no All tab; `out_for_delivery` orders are hidden (Deliveries owns them); Completed defaults to the last 7 days; cards use one next-step button plus a ⋯ menu; details open in a side panel (bottom sheet on phone). Existing fetch and status-update APIs are unchanged aside from optional `counts` and `since` query params.
- 2026-11-22 16:55: Employee navigation shell on `feat/employee-shell`: icon rail on tablet/desktop, bottom tabs on phone, and a More page (Deliveries, Customers, Meals, Subscription plans, and Accounts are live; Renewals and Settings are Coming soon). Meals is also listed under More so phone users can reach the catalog. Existing employee pages render inside the new shell unchanged. Customer and rider chrome are unchanged.
- 2026-11-21 23:01: M14 email notifications built on `feat/m14-email-notifications`: Gmail SMTP emails to opted-in employees on a new order and a new subscription inquiry, plus an "Email notifications" toggle in the staff notifications menu. Needs the new migration applied and the Gmail env vars set on Vercel.
- 2026-11-21 22:27: Boon reordered the open milestones by priority: M9 Meals, M10 Ordering and subscribing, M11 Employee, M12 Rider (re-test only), M13 Customer area, M14 Email notifications, M15 Verification.
- 2026-11-21 22:01: Root docs drafted to match the SignalScape layout: `REQUIREMENTS.md` (FR-1 to FR-49, already approved in progress), this file, `AGENTS.md`, and `README.md`. Done work is grouped as M1 to M8 (ticked from the 2026-11-17 audit of `main` at `e44d9de`). Remaining work is M9 to M16. No references to `MOBILE_APP.md` or `FEATURES`. These drafts live in the vault until Boon approves putting them in the repo. [PR #4](https://github.com/Brigoliboon/CookConnect/pull/4) (`docs/root-cleanup`) is still open and is superseded by this draft.
- 2026-11-21: Requirements updated from Boon's answers: Sharjah AED 100; customer dashboard (FR-37 to FR-39) stays in scope; no Tabby or card payment; staff dashboards stay English only. FR-32 revised (exclude on-call from suggestions). Added FR-48 (drinks and cakes add-ons) and FR-49 (Gmail email notifications).
- 2026-11-17: Read-only code audit of `main` at `e44d9de`. Auth and Supabase are wired. Employee, chef, and rider areas are API-backed. Only the customer pages, `/employee/deliveries`, and `/employee/customers/[id]` are mock.
- 2026-11-15: Food restrictions landed on `main` (`e44d9de`) (FR-17).
