# Cook Connect Restaurant

A bilingual (English/Arabic) website and staff system for Cook Connect LLC, a meal restaurant in Ajman, UAE.

Customers browse the menu, order for delivery or pickup, and sign up for meal subscriptions. Staff run orders, POS, subscriptions, the kitchen cook list, and deliveries from role dashboards. A separate WhatsApp sales bot uses this app's API for orders, invites, rates, and renewals.

**Live site:** https://cook-connect-omega.vercel.app

**Target users:** walk-in and online customers, subscribers, and restaurant staff (employee, chef, rider).

## Features

- English and Arabic public site with RTL, SEO, menu, cart checkout, and public order tracking
- Meal subscriptions: sign-up wizard, staff-managed inquiries, negotiated invite links, rates and delivery fees by area, food restrictions, and CSV import
- Employee dashboard: overview, orders board, POS, accounts, customers, meals, and thermal receipt printing
- Chef cook schedules from subscriber entitlements, with a shared kitchen batch suggestion
- Rider deliveries with a 6-digit confirmation code and live GPS
- API for the WhatsApp bot, protected by a shared secret
- Web push and email notifications to staff on new orders

What is still to build (customer dashboard, some employee pages, live subscription plans, and more) is in `IMPLEMENTATION.md`.

## Stack

| Part | Tech |
|---|---|
| App | Next.js 16 (App Router, TypeScript), React 19, Tailwind v4, next-intl, SWR, Mapbox |
| Database, auth, storage | Supabase (Postgres, Auth, Storage) |
| Hosting | Vercel |
| Printing | ESC/POS over Web Bluetooth |
| Push | Web push with VAPID |
| Bot API | Route Handlers behind the `x-bot-secret` header |

The WhatsApp bot and the separate POS app are not in this repository.

## Repo layout

```
CookConnect/
├── app/                    # App Router: [locale] public pages, (authenticated) dashboards, api/
├── components/ hooks/ lib/ utils/ constants/ types/
├── i18n/ messages/         # next-intl (en, ar)
├── proxy.ts                # auth + i18n (Next.js 16; not middleware.ts)
├── supabase/migrations/    # schema changes, applied to live Supabase
├── tests/                  # manual markdown test plans
├── REQUIREMENTS.md         # What to build
├── IMPLEMENTATION.md       # Build order and progress
├── AGENTS.md               # Workflow rules for contributors and agents
└── README.md
```

## Getting started

### Prerequisites

- Node.js 20.9 or later (required by Next.js 16)
- npm
- Access to the project's Supabase project and a Mapbox token

### Setup

```bash
git clone git@github.com:Brigoliboon/CookConnect.git
cd CookConnect
npm install
```

`.env.example` lists the email notification variables; add the rest from the tables below. `.gitignore` ignores every other `.env*` file. Create `.env.local` in the repo root with the variables you need, then:

```bash
npm run dev
```

Open http://localhost:3000.

### Scripts

```bash
npm run dev      # development server
npm run lint     # eslint
npm run build    # production build (also typechecks)
npm start        # serve the production build
```

`npm install` runs `patch-package` via `postinstall`. There is no `npm test` script; manual plans are in `tests/`.

### Environment variables

Names only. Put values in `.env.local` (local) or in the Vercel project (production). Never commit values.

**Required**

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Maps and delivery geocoding |
| `MEAL_BUCKET` | Supabase Storage bucket for meal images |
| `FATSECRET_CLIENT_ID` | Nutrition lookup |
| `FATSECRET_CLIENT_SECRET` | Nutrition lookup (server only) |
| `PUSH_VAPID_PUBLIC_KEY` | Web push public key |
| `PUSH_VAPID_PRIVATE_KEY` | Web push private key (server only) |
| `PUSH_VAPID_SUBJECT` | Web push subject |
| `WHATSAPP_BOT_SECRET` | Shared secret for bot API routes (`x-bot-secret`) |
| `POS_SECRET` | Shared secret for POS-originated orders |
| `GMAIL_USER` | Restaurant Gmail address that sends email notifications (server only; emails are skipped if unset) |
| `GMAIL_APP_PASSWORD` | Gmail App Password for `GMAIL_USER` (server only; emails are skipped if unset) |

**Optional**

| Name | Purpose |
|---|---|
| `SUBSCRIPTION_INVITE_SECRET` | Signs subscription invite links (falls back to `SUPABASE_SERVICE_ROLE_KEY`) |
| `DEFAULT_COUNTRY_CODE` | Default country code; falls back to `971` |
| `IMAGE_CONCURRENCY` | Concurrency for image tools under `tools/`; defaults to `8` |
| `EMAIL_FROM_NAME` | Sender display name for email notifications; defaults to "Cook Connect" |

### Database

Schema changes belong in `supabase/migrations/` and must be applied to the live Supabase project. Whether every migration is already applied in production is still unverified; see M15 in `IMPLEMENTATION.md`.

## Documentation

| Doc | What it covers |
|---|---|
| [REQUIREMENTS.md](REQUIREMENTS.md) | What to build (FR, NFR, technical requirements) |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Milestone order, checkboxes, and progress log |
| [AGENTS.md](AGENTS.md) | Layout, stack, commands, conventions, and the PR workflow |
| [tests/](tests/) | Manual test plans |

## Contributing

Read `AGENTS.md` first. In short: work through `IMPLEMENTATION.md` in order, use one branch per item off `main`, run `npm run lint` and `npm run build`, open a pull request, and tick the checkbox in the same pull request.

## Privacy

Personal data (names, phones, addresses, food restrictions, payment records) is handled under the UAE PDPL. Collect only what orders and subscriptions need, with consent at checkout and sign-up. See `REQUIREMENTS.md`.

## Client

Cook Connect LLC, Ajman, UAE.
