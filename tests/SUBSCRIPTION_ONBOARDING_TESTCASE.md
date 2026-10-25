# Subscription Onboarding — Testcase

Scope: `/subscription-onboarding` progressive form, legacy `/subscription` redirect, signed invite token validation, and inquiry submission.

Run date: 2026-10-25 · `npx tsc --noEmit` clean · `npm run build` successful · focused `eslint` = 0 errors.

## T — Invite token unit (`lib/subscription/invite-token.ts`)

- [x] **T1** `createSubscriptionInviteToken("healthy", 1)` returns a token and future ISO expiry
- [x] **T2** valid token + matching plan → `{ valid: true, plan: "healthy" }`
- [x] **T3** valid token + different plan → invalid (`This invitation is for a different plan`)
- [x] **T4** tampered signature → invalid (`Invitation token is invalid`)
- [x] **T5** malformed token → invalid
- [x] **T6** expired token → invalid (`This invitation link has expired`)
- [ ] **T7** missing secret → invalid (`Invitation validation is not configured`)

## R — Routing

- [x] **R1** `GET /subscription-onboarding?plan=healthy` → 200
- [x] **R2** `GET /subscription?plan=healthy` → 307 to `/subscription-onboarding?plan=healthy`
- [x] **R3** Arabic legacy link preserves `/ar` prefix
- [x] **R4** landing plan CTA points to `/subscription-onboarding?plan=<id>`

## V — Invite API

- [ ] **V1** `POST /api/subscription-invites` unauthenticated → 401
- [ ] **V2** `POST /api/subscription-invites` customer role → 403
- [ ] **V3** employee/admin + known plan → 201 with `token`, `expiresAt`, `path`, `url`
- [ ] **V4** unknown plan → 400
- [ ] **V5** `expiresInDays` outside 1–365 → 400
- [x] **V6** `GET /api/subscription-invites/validate?token=bad&plan=healthy` → 400
- [ ] **V7** valid token → 200 `{ valid: true, plan, expiresAt }`
- [ ] **V8** valid token with mismatched plan → 400
- [ ] **V9** request body never echoes the signing secret

## F — Form flow

- [ ] **F1** Steps: Plan → Details → Preferences → Meals (flexible only) → Delivery → Review
- [ ] **F2** Normal mode skips Meals; step count drops to 5
- [ ] **F3** Next blocked on Details until name, 9-digit UAE mobile and address exist
- [ ] **F4** Next blocked on Meals until at least one meal is selected
- [ ] **F5** Next blocked on Delivery until days + slots are chosen (unless on-call)
- [ ] **F6** Back preserves all values; completed steps are clickable, future steps are not
- [ ] **F7** Review summary reflects every entered value; Edit jumps to the owning step
- [ ] **F8** Terms modal requires scrolling before submit
- [ ] **F9** Staff mode still requires customer selection and creates via `POST /api/subscriptions`
- [ ] **F10** Public submit creates `subscription_inquiries` row (not `subscriptions`)

## I — Invite enforcement

- [ ] **I1** Valid `?plan=…&token=…` shows verified banner + expiry
- [ ] **I2** Invalid/expired token blocks the form with a clear message
- [ ] **I3** Token plan overrides a missing plan param
- [ ] **I4** Submitting with a tampered/expired token → 400 and no inquiry row
- [ ] **I5** Submitting with a valid token stores `details.invite = { verified: true, expiresAt }`
- [ ] **I6** No token still allows the public flow (landing CTA compatibility)

## Manual approval path

- [ ] **A1** Staff sees inquiry in `/employee/subscriptions`
- [ ] **A2** Approve copies inquiry details into `subscriptions.details`, records payment when > 0, and deletes the inquiry
