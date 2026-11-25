# Cook Connect Restaurant: Requirements

Client: Cook Connect LLC (Ajman, UAE). Website and staff system for the restaurant's orders and meal subscriptions. Draft by Ledger, 2026-11-17, from the code audit ([[cook-connect-restaurant-2026-11-17]]), the old FEATURES.MD and the client meeting notes in [[cook-connect-llc]].

Status tags: **[Done]** built and wired to the API/DB, **[Partial]** built but with gaps or unverified, **[Todo]** not built or mock only.

## 1. Overview

A bilingual (English/Arabic) Next.js website for Cook Connect, a meal restaurant in Ajman. Customers browse the menu, order for delivery or pickup, and sign up for meal subscriptions. Staff run the business from role dashboards: employees manage orders, POS, subscriptions, customers and meals; chefs plan daily cooking from subscriber entitlements; riders take and complete deliveries. A WhatsApp sales bot (separate repo) uses the same API for orders, invites, rates and renewals. Data and auth are in Supabase.

**Users:** walk-in and online customers, subscribers, and restaurant staff (employee/admin, chef, rider).

## 2. Problem

Orders and subscriptions were handled by hand and over chat. Subscriber meal counts, restrictions, delivery fees and renewals were hard to track, and the kitchen had no single cook list.

## 3. Goal

One system where customers order and subscribe, and staff handle orders, subscriptions, cooking and delivery from the same data, with the WhatsApp bot plugged into it.

## 4. Objectives

1. Public bilingual site with SEO that drives orders and subscription sign-ups.
2. Online ordering with server-side pricing and VAT, plus public order tracking.
3. Subscription sales: sign-up wizard, negotiated invites, rates and delivery fees by area, food restrictions, CSV import of existing subscribers.
4. Staff dashboards for orders, POS, customers, meals, subscriptions and payments.
5. Chef planning from subscriber entitlements, and rider delivery with a confirmation code.
6. API endpoints the WhatsApp bot can use for orders, invites, rates, reminders and renewals.

## 5. Scope

**In scope**
- Website (customer-facing and staff dashboards) in `restaurant/`.
- Supabase database, auth and storage.
- API used by the WhatsApp bot.
- Thermal printing (ESC/POS over Web Bluetooth) and web push for staff.

**Out of scope (separate projects or later)**
- The WhatsApp bot itself (`cookconnect-whatsapp-bot/`).
- The POS app (`pos_application/`) and the mobile app (Capacitor plan only).
- Online card payment, including Tabby (confirmed out of scope 2026-11-21).

## 6. Functional requirements

### 6.1 Landing page
- FR-1 [Done]: English and Arabic pages with RTL layout and a language toggle.
- FR-2 [Done]: Hero with live top sellers, featured meals, healthy campaign, plans, about, contact map, footer.
- FR-3 [Done]: SEO: metadata, sitemap, robots, OG images, JSON-LD, Google Analytics.
- FR-4 [Partial]: Plan cards read live plans from `/api/subscription-plans` (currently hardcoded constants).
- FR-5 [Done]: Terms and privacy pages.

### 6.2 Menu and ordering
- FR-6 [Done]: Menu with categories, subcategories, search and sort.
- FR-7 [Done]: Add-ons and sides on items.
- FR-8 [Done]: Cart and checkout for delivery (map pin, Ajman only) or pickup, with consent.
- FR-9 [Done]: Server recalculates prices and VAT (VAT-inclusive).
- FR-10 [Done]: Public order tracking by code with verification.
- FR-11 [Partial]: Arabic meal names stored in the database (currently a dictionary in code).
- FR-50 [Todo]: Meal modifiers. Reusable groups attached to meals, for sides (for example "Choose your side") or other pick-one choices such as spice level ("Spicy / Not spicy"). v1 is single-select and required when attached; the add-on price is set per option and is independent of any linked side's menu price (0 = free). An option's side recipe is optional, so a spice-level choice does not need a recipe. English and Arabic labels. Server validates the selection and charges it. Orders snapshot the chosen group, option, price, side recipe id (when present), and Arabic names. A meal with an attached group that has no active options cannot be ordered. When a meal with attached groups is added to the cart or a POS order, a dialog asks the customer or staff to pick one option per group (later PR). Modifiers apply to regular cart and POS orders. A meal included in subscriptions may still have groups, but subscription and Chef flows ignore them and use the base meal with no add-ons (FR-48 stays separate). Meal CSV import has no modifier columns in v1. The experimental `recipe_addons` / `order_item_addons` tables stay until a later follow-up copies historical rows and drops them.

### 6.3 Subscriptions
- FR-12 [Done]: Sign-up wizard: plan, details, preferences, meals, delivery, review.
- FR-13 [Done]: Inquiries that staff approve or reject.
- FR-14 [Done]: Signed invite links with a negotiated price (used by the bot).
- FR-15 [Done]: Rates by duration (6/15/20/26/30/45 days) and meals per day (1 to 5) from the backend.
- FR-16 [Done]: Delivery fees by area, charged per delivery for subscriptions: Ajman free, Sharjah AED 100 (confirmed 2026-11-21), Dubai AED 200 (to confirm: 150 or 200).
- FR-17 [Done]: Food restrictions (ingredients and skipped categories) that meal selection and the chef auto-fill respect.
- FR-18 [Done]: Staff create a subscription for a customer.
- FR-19 [Done]: Staff pause, resume, cancel, edit contact details and record payments.
- FR-20 [Done]: CSV import of existing subscribers with preview (leftover meals, pause state, notes, map pins).
- FR-21 [Done]: Staff choose which meals are available to subscribers.
- FR-48 [Todo]: Subscribers can add a drinks add-on and a cakes add-on, AED 100 each for the whole plan. Each is a fixed bundle using the item lists in `POS Menu Matrix - CookConnect Restaurant - Meal Plan monthly menu.csv` (no item picking). Add-on prices are fixed and are added on top of the negotiated plan price; they do not repeat per delivery. Add-ons appear in public and staff forms, inquiry and CSV details, staff views, emails, sales totals, and the chef cook sheet as extras that do not consume meal credits. Public add-on copy is bilingual.
- FR-22 [Partial]: Staff subscription form saves the delivery location (currently sent empty).

### 6.4 Employee dashboard
- FR-23 [Done]: Overview: needs-attention counts, sales, order pipeline, delivery map.
- FR-24 [Done]: Orders board with filters, status updates and thermal receipt printing.
- FR-25 [Done]: POS for dine-in, pickup and delivery.
- FR-26 [Done]: Staff account management.
- FR-27 [Done]: Customer list.
- FR-28 [Todo]: Customer details page (currently mock), and customers page linked in the nav.
- FR-29 [Done]: Meal management with nutrition lookup and printed nutrition stickers.
- FR-30 [Todo]: Deliveries page (currently mock): change today's time and location, manage statuses.

### 6.5 Chef
- FR-31 [Done]: Daily cook schedules from subscriber entitlements (protein credits, remaining meals, paused or used-up subscriptions skipped, breakfast extras).
- FR-32 [Partial]: Shared kitchen batch suggestion, chicken-first with occasional seafood. Revision: exclude on-call-only meals from suggestions.
- FR-33 [Done]: Daily standards and plan protein credits.

### 6.6 Rider
- FR-34 [Done]: List of orders ready for pickup and the rider's own deliveries.
- FR-35 [Done]: Take an order and complete it with the customer's 6-digit code.
- FR-36 [Done]: Share live GPS location.

### 6.7 Customer area
- FR-37 [Todo]: Customer dashboard: remaining meals and protein credits, delivery schedule, today's meals (currently mock).
- FR-38 [Todo]: Edit profile and save it (Save currently does nothing).
- FR-39 [Todo]: Change today's delivery time or location before the cutoff.

### 6.8 Accounts and roles
- FR-40 [Done]: Email and password sign-in with Supabase; roles employee, chef, rider, customer; inactive accounts blocked.
- FR-41 [Done]: Role-protected routes for `/employee`, `/rider`, `/customer`.
- FR-42 [Todo]: New staff accounts get a set-password or invite email instead of the fixed `temporary123` password.

### 6.9 Notifications
- FR-43 [Done]: Notification bell with unread count and mark-all-read.
- FR-44 [Done]: Web push to staff on new orders.
- FR-49 [Done]: Email notifications sent from the restaurant's Gmail account (Gmail SMTP with an App Password) to staff who have email notifications enabled. Triggers: a new order and a new subscription inquiry. Recipients: active employee accounts that turned on "Email notifications" in the notifications menu (off by default).

### 6.10 WhatsApp bot API
- FR-45 [Done]: Bot can place orders, look up deliveries, create invites and read rates (bot secret).
- FR-46 [Done]: Renewal reminder 3 days before expiry, and recording why a customer didn't renew.
- FR-47 [Todo]: Staff view of the reminder and renewal queue.

## 7. Technical requirements

| # | Requirement | How it's met |
|---|---|---|
| T-1 | Framework | Next.js 16 App Router, TypeScript, Tailwind v4 |
| T-2 | Database, auth, storage | Supabase (Postgres, Auth, Storage) |
| T-3 | Languages | next-intl, English and Arabic with RTL |
| T-4 | Maps | Mapbox |
| T-5 | Hosting | Vercel |
| T-6 | Bot integration | API routes protected by `x-bot-secret` |
| T-7 | Printing | ESC/POS over Web Bluetooth |
| T-8 | Push | Web push with VAPID |
| T-9 | Database changes | Every change as a migration in `supabase/migrations/`, applied to the live project |

## 8. Pages

Public: landing (EN/AR), menu, menu category, order tracking, subscription sign-up, terms, privacy, sign-in.
Employee: overview, orders, POS, subscriptions, customers, customer details, meals, subscription meals, accounts, deliveries.
Chef: cook schedule. Rider: deliveries. Customer: dashboard, profile.

## 9. Data privacy

- Personal data: names, phone numbers, addresses and map pins, food restrictions and body details, payment records.
- Under the UAE personal data law (PDPL), collect only what orders and subscriptions need, with consent at checkout and sign-up.
- Row-level security on Supabase tables so each role sees only its data (to verify).
- HTTPS everywhere; no shared default passwords (FR-42).

## 10. Non-functional requirements

- NFR-1: Pages fast on mobile (optimized AVIF/WebP images, cached API responses).
- NFR-2: Prices and VAT are always calculated on the server.
- NFR-3: Staff dashboards work on phones and tablets.

## 11. Known constraints and risks

- Some migrations may not be applied on the live Supabase (`order_origin_delivered_at`, `notifications_mark_read`).
- Row-level security not yet verified.
- Several test plans not run since the November changes (subscriptions backend, chef schedules, notifications); `tests/SUBSCRIPTIONS_BACKEND_TESTCASE.md` is missing.
- Authenticated dashboards are English only.

## 12. Open questions

- Dubai delivery fee: AED 150 or AED 200 (code uses 200)?
- FR-48 resolved 2026-11-25: 100 is AED 100 per add-on for the whole plan; exact items are the drinks and cakes rows in the POS menu matrix CSV.

Resolved 2026-11-21: Sharjah AED 100; customer dashboard (FR-37 to FR-39) stays in scope; no Tabby or card payment; staff dashboards stay English only; FR-49 emails go out on a new order and a new subscription inquiry, to staff who opt in.

## 13. Change log

Newest first. Times are Asia/Manila (UTC+8).

### 2026-11-25
- Boon resolved FR-48: drinks and cakes are fixed-bundle add-ons at AED 100 each for the whole plan, using the exact item lists from the POS menu matrix CSV. The negotiated invite price covers only the plan; add-ons are fixed and added on top. Chosen items appear on the chef cook sheet as non-entitlement extras, and CSV import gets optional add-on columns.

### 2026-11-24
- Added FR-50 meal modifiers (approved by Boon): reusable single-select required groups for sides or other choices such as spice level, add-on price independent of menu price, optional option recipe, EN/AR labels, server-validated and snapshotted on orders. A picker dialog at add-to-cart / POS is a later step.
- Boon confirmed v1 decisions: pick-one and required only; the order snapshot also stores the side recipe id and its Arabic name. He later clarified that subscription orders get no add-ons, but the same meal ordered normally (cart or POS) can have modifiers, so groups may be attached to `is_subscription_included` meals. The old `recipe_addons` / `order_item_addons` tables stay until a later follow-up. Meal CSV is out of v1.

### 2026-11-21
- FR-49 answered and built: emails on a new order and a new subscription inquiry, sent to opted-in staff.
- Boon's answers: Sharjah AED 100, customer dashboard in scope, no Tabby, dashboards English only.
- Revised FR-32 to exclude on-call-only meals. Added FR-48 (drinks and cakes add-ons) and FR-49 (Gmail email notifications).

### 2026-11-17
- First REQUIREMENTS.md, written from the code audit of `main` at `e44d9de`.
