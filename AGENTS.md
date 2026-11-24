# AGENTS.md: Cook Connect Restaurant

Rules for any coding agent (or person) working in this repo. Read this, `REQUIREMENTS.md` and `IMPLEMENTATION.md` before changing anything.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project in one line

Cook Connect is a bilingual Next.js website and staff system for Cook Connect LLC (Ajman, UAE): menu ordering, meal subscriptions, and role dashboards for employees, chefs, and riders.

## Source of truth

- `REQUIREMENTS.md`: what to build. Every feature has an id (`FR-x`, `NFR-x`, `T-x`).
- `IMPLEMENTATION.md`: the order to build it in, as milestones M1 to M16 with checkboxes.
- If a task isn't in either file, stop and ask before building it. Don't add scope.

## Repo layout

- `app/`: Next.js App Router.
  - `app/[locale]/`: public pages (landing, menu, checkout-related flows, subscription sign-up, order tracking, terms, privacy, login).
  - `app/(authenticated)/`: employee, chef, rider, and customer dashboards. These routes are English only and sit outside the locale group.
  - `app/api/`: Route Handlers.
- `components/`, `hooks/`, `lib/`, `utils/`, `constants/`, `types/`: UI and shared logic.
- `i18n/`, `messages/`: next-intl routing and `en` / `ar` copy.
- `proxy.ts`: auth session handling plus next-intl middleware. This project uses `proxy.ts`, not `middleware.ts` (Next.js 16).
- `supabase/migrations/`: schema changes only. Apply them to the live Supabase project.
- `tests/`: manual markdown test plans. There is no Vitest, Playwright, or `npm test` script.
- `docs/`, `legal/`, `tools/`, `patches/`, `chatbot/`: supporting notes, legal copy, image tools, `patch-package` patches, and WhatsApp bot context. Don't treat `docs/` as newer than `REQUIREMENTS.md`.
- Don't create new top-level folders without asking.

The WhatsApp bot (`cookconnect-whatsapp-bot/`) and the POS app (`pos_application/`) are separate projects, not this repo.

## Stack (fixed; don't swap without approval)

- **App:** Next.js 16 (App Router, TypeScript), React 19, Tailwind v4, next-intl, SWR, Mapbox, Framer Motion.
- **Database, auth, storage:** Supabase (Postgres, Auth, Storage).
- **Hosting:** Vercel. Production: https://cook-connect-omega.vercel.app.
- **Printing:** ESC/POS over Web Bluetooth.
- **Push:** Web push with VAPID (`public/sw.js`).
- **Bot integration:** API routes protected by the `x-bot-secret` header.
- Out of scope: the WhatsApp bot itself, the separate POS app, a Capacitor mobile app, and online card payment including Tabby.

## Commands

From the repo root (`package.json` scripts):

```bash
npm install          # postinstall runs patch-package
npm run dev          # next dev
npm run lint         # eslint
npm run build        # next build
npm start            # next start (after build)
```

There is no `test` or `typecheck` script. `npm run build` is the typecheck. Manual plans live in `tests/`. Re-run the relevant plan when you change that area.

## Environment variables

Names only. Never commit values. `.env.example` lists the email env var names; `.gitignore` ignores every other `.env*` file. Use `.env.local` locally and Vercel project env vars in production.

Required by the running app (referenced in source):

| Name | Where it is used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service client. Never prefix this with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Maps and geocoding |
| `MEAL_BUCKET` | Supabase Storage bucket for meal images |
| `FATSECRET_CLIENT_ID` | Nutrition lookup |
| `FATSECRET_CLIENT_SECRET` | Nutrition lookup (server only) |
| `PUSH_VAPID_PUBLIC_KEY` | Web push |
| `PUSH_VAPID_PRIVATE_KEY` | Web push (server only) |
| `PUSH_VAPID_SUBJECT` | Web push |
| `WHATSAPP_BOT_SECRET` | Shared secret compared to the `x-bot-secret` header |
| `POS_SECRET` | Optional POS origin header on `POST /api/orders` |
| `GMAIL_USER` | Restaurant Gmail address that sends email notifications (server only). Emails are skipped if unset. |
| `GMAIL_APP_PASSWORD` | Gmail App Password for `GMAIL_USER` (server only). Emails are skipped if unset. |
| `EMAIL_FROM_NAME` | Optional sender display name for email notifications (defaults to "Cook Connect") |

Optional (have defaults or fallbacks in code):

| Name | Notes |
|---|---|
| `SUBSCRIPTION_INVITE_SECRET` | Signs invite links. If unset, the code falls back to `SUPABASE_SERVICE_ROLE_KEY`. |
| `DEFAULT_COUNTRY_CODE` | Defaults to `971`. |
| `IMAGE_CONCURRENCY` | Image tools under `tools/` only. Defaults to `8`. |

`NEXT_SECRET_MAPBOX_TOKEN` appears in a local env file but is not referenced in source (unverified / unused). FR-49 will need additional Gmail SMTP or Gmail API variables when it is built; add their names here and in `README.md` in the same PR, still never values.

## Conventions

- **Migrations:** every schema change is a new file in `supabase/migrations/`. Never edit the live database by hand. Apply the migration to the live Supabase project in the same change (or immediately after merge). Call out unverified live migrations in `IMPLEMENTATION.md` M15.
- **Pricing and VAT:** always recalculate on the server (NFR-2). Don't trust amounts from the client.
- **i18n:** public pages use next-intl with `en` and `ar` (`localePrefix: "as-needed"`, default `en`). Authenticated dashboards stay English only and are not under `app/[locale]/`.
- **Bot routes:** authenticate with `getBotClient()` in `lib/bot-auth.ts`. Compare `x-bot-secret` to `WHATSAPP_BOT_SECRET`. Don't add a new bot endpoint without that check.
- **Service role key:** server-only (Route Handlers, server utilities). Never import it into a Client Component.
- **`NEXT_PUBLIC_`:** only for values that are safe in the browser (Supabase URL, publishable key, Mapbox token). Never prefix the service role key, bot secret, POS secret, VAPID private key, or FatSecret secret.
- **Roles:** `employee`, `chef`, `rider`, and `customer` are the nav roles. Some APIs also mention `admin`; don't invent a new admin dashboard unless `REQUIREMENTS.md` says so.
- **On-call:** `details.onCall` is a subscription delivery mode (no scheduled days), not a meal flag. `activeOn()` in `lib/chef/day.ts` already skips on-call subscriptions when building the day's cook list.

## Build loop

M1 to M8 are done. Work through the first unchecked item in the current remaining milestone (M9 onwards), unless Boon says otherwise.

1. **Pick** the first unchecked item in the current milestone of `IMPLEMENTATION.md`.
2. **Confirm** which requirement ids it covers. If it's unclear, or if an open question in `REQUIREMENTS.md` blocks it, ask before coding.
3. **Branch** off latest `main`: `feat/<milestone>-<short-name>` (for example `feat/m9-plan-cards`). Fixes use `fix/...`, docs use `docs/...`.
4. **Build** the smallest change that completes the item. Don't touch unrelated code.
5. **Check** locally: `npm run lint` and `npm run build`. Re-run any manual plan in `tests/` that covers the change.
6. **Pull request** into `main` with the template below. Never push straight to `main`. One feature per PR, branched from `main`, not stacked on another unmerged branch.
7. **Update docs** in the same pull request: tick the checkbox in `IMPLEMENTATION.md` and add a dated line to its progress log (Asia/Manila, UTC+8). Update `REQUIREMENTS.md` only if a requirement changed and Boon approved it. If several open PRs would all edit `IMPLEMENTATION.md`, hold the tick and the log line for a small follow-up PR so they don't conflict.
8. **Merge** after review. The merge deploys on Vercel. If `supabase/migrations/` changed, apply those migrations to the live project and say so in the PR. Check https://cook-connect-omega.vercel.app afterwards.
9. Repeat with the next item.

There is no `.github/workflows` directory in this repo today, so there are no CI required checks to rely on. Until CI exists, lint and build locally and paste the result in the PR. Don't invent workflows in a feature PR unless Boon asks for CI.

### Pull request template

```
What: <one line>
Covers: <FR/NFR/T ids>, milestone <Mx>
Tests: <lint, build, and which tests/ plan was re-run>
Notes: <migrations, env vars, anything a reviewer must know>
```

### Commit messages

Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`, `refactor:`. Keep them short and present tense.

## Don'ts

- Don't add features, libraries, or services outside the stack without approval.
- Don't skip a remaining milestone or work ahead of the current one unless Boon says so.
- Don't rewrite or delete existing docs; update the relevant section.
- Don't touch unrelated code.
- Don't commit secrets or env files.
- Don't push to `main`. Don't force-push to `main`. Don't stack feature branches on each other.
- Don't leave `REQUIREMENTS.md` or `IMPLEMENTATION.md` stale after a change that finishes (or changes) a requirement.
