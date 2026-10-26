# Subscription Invite — Negotiated Price Testcase

Scope: signed invite tokens carry the bot's agreed price through onboarding, inquiry
storage, and staff approval. Pricing authority stays with the WhatsApp bot.

Run date: TBD · `npx tsc --noEmit` · `npm run lint`

## T — Token unit (`lib/subscription/invite-token.ts`)

- [x] **T1** `createSubscriptionInviteToken("standard-15", 14, { agreedPriceCents: 37500 })` → token; verify returns `agreedPriceCents: 37500`
- [x] **T2** Token carries `basePriceCents`, `concession`, and `currency: "AED"` when supplied
- [x] **T3** Legacy token `{ plan, exp }` still verifies; price fields are `undefined`
- [x] **T4** Tampered signature → `{ valid: false }` (price cannot be forged)
- [ ] **T5** Expired token with price → `{ valid: false }`
- [x] **T6** Non-integer/negative `agreedPriceCents` rejected at creation (throws)
- [x] **T7** Token for plan A validated against plan B → `{ valid: false }`

## V — Invite API with bot auth

- [ ] **V1** `POST /api/subscription-invites` unauthenticated, no bot header → 401
- [ ] **V2** `POST` with wrong `x-bot-secret` → 401
- [ ] **V3** `POST` with valid `x-bot-secret` + `{ plan, price_cents }` → 201 with `url`, `token`, `price_cents`
- [ ] **V4** Returned URL points to `/subscription-onboarding?plan=…&token=…`
- [ ] **V5** `locale: "ar"` → URL path starts with `/ar/subscription-onboarding`
- [ ] **V6** `price_cents` not a positive integer → 400
- [ ] **V7** Unknown `plan` → 400
- [ ] **V8** Employee/admin cookie flow still works without bot header
- [ ] **V9** Response never echoes `SUBSCRIPTION_INVITE_SECRET` / service key
- [ ] **V10** Employee dialog with a price → 201 and the generated token carries `agreedPriceCents`
- [ ] **V11** Employee dialog with a blank price → unpriced invite (legacy behaviour)
- [ ] **V12** Invite API accepts `meals_per_day` 1–5 and rejects 0/6
- [ ] **V13** `standard-30` plan slug is accepted (migration + constants)
- [ ] **V14** `healthy` still accepted

## G — Validate endpoint

- [ ] **G1** Valid priced token → 200 `{ valid: true, plan, expiresAt, agreedPriceCents }`
- [ ] **G2** Valid legacy token → 200 without `agreedPriceCents`
- [ ] **G3** Tampered token → 400
- [ ] **G4** Plan mismatch → 400
- [ ] **G5** Valid token with meals/day → 200 with `mealsPerDay`

## O — Onboarding form (`SubscriptionForm.tsx`)

- [ ] **O1** Priced invite shows the agreed amount (AED) and keeps the plan locked
- [ ] **O2** Legacy invite shows no agreed-price block (unchanged UI)
- [ ] **O3** Submit with priced token succeeds and sends `invite_token`
- [ ] **O4** Submit with tampered token → 400 and no inquiry row
- [ ] **O5** Customer cannot edit the price anywhere in the form
- [ ] **O6** Priced/meal invite prefills the Meals per day control; customer can change it (1–5)

## I — Inquiry persistence (`POST /api/subscription-inquiries`)

- [ ] **I1** Priced token → row `details.invite = { verified: true, expiresAt, agreedPriceCents, basePriceCents, concession, currency }`
- [ ] **I2** Legacy token → `details.invite` still `{ verified: true, expiresAt }`
- [ ] **I3** Body-supplied `agreedPriceCents` is ignored; token is the only source
- [ ] **I4** Tampered/expired token → 400 and no row
- [ ] **I5** Inquiry stores the submitted/edited `details.mealsPerDay`

## A — Approval (`POST /api/subscription-inquiries/[id]/approve`)

- [ ] **A1** `total_cents` omitted + agreed price present → subscription/payment use the agreed price
- [ ] **A2** `total_cents` equal to agreed price → 201
- [ ] **A3** `total_cents` different from agreed price → 400, inquiry not deleted
- [ ] **A4** Inquiry without agreed price → existing behaviour (UI-supplied total required)
- [ ] **A5** Subscription `details` include `agreed_price_cents` for audit
- [ ] **A6** Employee modal shows the agreed price and prefills the total field
- [ ] **A7** Approve resolves `standard-30` vs `healthy` by slug (both 30 days)
