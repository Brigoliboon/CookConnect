# Subscription Add-ons — Testcase

Scope: FR-48 drinks and cakes add-ons in public onboarding, staff subscriptions, invite links, CSV import, approval/pricing, staff views, emails, sales totals, and chef cook sheet.

Reference lists: `/home/devxploit/Desktop/POS Menu Matrix - CookConnect Restaurant - Meal Plan monthly menu.csv`
- Cakes: Brownies Cake, Carrot Cake, Banana Mix with Nuts Cake, Mango Banana Walnut.
- Drinks: Blueberry Banana Greek Yogurt, Strawberry Banana Greek Yogurt, Mixed Berries Walnut Protein Shake, Chocolate Protein Shake, Avocado & Banana Shake, Banana Milk & Walnut Juice, Carrot & Ginger Juice, Kiwi Juice, Lime & Mint Juice, Green Apple Juice, Pineapple Juice, Carrot Juice, Banana Strawberry Juice, Orange Juice, Strawberry and Lemon Juice.

## A — Public onboarding

- [ ] **A1** Preferences step shows two optional add-ons: Drinks (AED 100) and Cakes (AED 100), each described as one item from its list for the whole plan.
- [ ] **A2** Neither add-on is selected by default; breakfast remains unchanged.
- [ ] **A3** Public copy is available in English and Arabic.
- [ ] **A4** Review screen shows each selected add-on, its AED 100 price, and the add-ons total; invited plans also show the final total (agreed plan price + add-ons).
- [ ] **A5** Back/forward navigation preserves add-on selections.
- [ ] **A6** Submitting creates an inquiry whose details contain the selected add-on flags, with no per-item picker.
- [ ] **A7** No add-on selected → inquiry details contain no add-on charge and the total is the plan price only.
- [ ] **A8** Valid invite prefill restores add-on selections; invalid invite blocks submission as before.

## B — Staff form and invite links

- [ ] **B1** Staff subscription form shows the same two add-ons and can save them with the subscription.
- [ ] **B2** Invite links can carry add-on preferences; validation returns them to the public form.
- [ ] **B3** Negotiated invite price covers only the plan. Add-ons are fixed at AED 100 each and are added on top; staff cannot discount them through the invite.
- [ ] **B4** Drinks only → total is agreed plan price + AED 100.
- [ ] **B5** Cakes only → total is agreed plan price + AED 100.
- [ ] **B6** Both → total is agreed plan price + AED 200.
- [ ] **B7** Add-ons are charged once for the whole plan, not per meal, day, or delivery.

## C — Approval, storage, and pricing

- [ ] **C1** Approving an inquiry carries add-on flags into `subscriptions.details`.
- [ ] **C2** Server recalculates the total: base plan price plus AED 100 per selected add-on, ignoring any client-supplied add-on amount.
- [ ] **C3** Recorded payment amount equals the final total when payment is recorded.
- [ ] **C4** Sales/report totals include add-on revenue.
- [ ] **C5** Old subscriptions and inquiries without add-on fields still load and approve normally.
- [ ] **C6** No database migration is required for add-on flags; they live in the existing details JSON.

## D — CSV import

- [ ] **D1** Optional CSV columns for drinks and cakes add-ons are documented in the template/preview.
- [ ] **D2** Missing add-on columns default to false; old CSV files import unchanged.
- [ ] **D3** True/false values follow the existing `breakfast` column parsing.
- [ ] **D4** Preview shows selected add-ons before import.
- [ ] **D5** Imported subscriptions store add-ons in `details`.

## E — Staff visibility and email

- [ ] **E1** Employee subscription list shows badges for selected add-ons.
- [ ] **E2** Inquiry detail sheet shows selected add-ons and that each includes one item from its list.
- [ ] **E3** New-inquiry email to opted-in staff lists selected add-ons.

## F — Chef cook sheet

- [ ] **F1** When an active subscription has an add-on, exactly one item from that add-on's list appears on the relevant day's cook sheet.
- [ ] **F2** Add-on items are marked as extras and do not consume meal credits or entitlement counts.
- [ ] **F3** Drinks and cakes do not alter the main meal count or daily standards.
- [ ] **F4** Add-on items do not appear for subscriptions without the add-on.
- [ ] **F5** On-call subscriptions remain outside the daily cook sheet today; add-ons follow the same rule and do not create a separate on-call list.
- [ ] **F6** Both add-ons selected → at most two add-on rows (one drink, one cake) for that subscriber, with readable recipe names.

## G — Verification

- [ ] **G1** `npm run lint` has no new errors in changed files.
- [ ] **G2** `npm run build` passes.
- [ ] **G3** Re-run `tests/SUBSCRIPTION_ONBOARDING_TESTCASE.md` and `tests/SUBSCRIPTION_INVITE_PRICE_TESTCASE.md`.
- [ ] **G4** Re-run `tests/CHEF_SCHEDULES_TESTCASE.md` for the non-entitlement extras.
