# Subscription Rates — Testcase

Scope: backend-owned plan pricing. `subscription_plan_rates` is the price source; the bot
queries `GET /api/subscription-rates` instead of reading `config/subscriptions.json`.

## R — Rates endpoint

- [ ] **R1** `GET /api/subscription-rates` without `plan` → 400
- [ ] **R2** `meals_per_day` 0/6/non-integer → 400
- [ ] **R3** Unknown plan slug → 404
- [ ] **R4** `plan=standard-15&meals_per_day=4` → `list_price_cents: 145200`, `floor_price_cents: 132000`, counters `[140800,136400,132000]`, `total_meals: 60`
- [ ] **R5** `plan=healthy&meals_per_day=1` → 200 with the healthy rate
- [ ] **R6** `plan=standard-6&meals_per_day=5` → 200
- [ ] **R7** Anonymous/public key can read active rates (RLS policy)
- [ ] **R8** Inactive rate or inactive plan → 404

## I — Invite creation validation (bot only)

- [ ] **I1** Bot invite with `meals_per_day` missing → 400
- [ ] **I2** Bot invite with a price not in list/counter offers → 400
- [ ] **I3** Bot invite with list price or a counter offer → 201, token carries `meals_per_day`
- [ ] **I4** Staff invite with an arbitrary positive price → 201 (no rate enforcement)
- [ ] **I5** Rate lookup failure → 400, no token created

## S — Plan catalog

- [ ] **S1** `subscription_plans` contains `standard-6`, `standard-15`, `standard-20`, `standard-26`, `standard-30`, `standard-45`, `healthy`
- [ ] **S2** `subscription_plan_rates` has 31 rows (the 6-day and 30-day plans included)
- [ ] **S3** `/api/subscription-plans` still returns the duration plans

## B — Bot integration

- [ ] **B1** `get_subscription_offer` calls `/api/subscription-rates?plan=…&meals_per_day=…`
- [ ] **B2** `subscription_signup_link` uses the same backend rate for validation
- [ ] **B3** `get_subscription_plans` no longer returns `list_price`
- [ ] **B4** Backend rate failure → tool error, no invented price
