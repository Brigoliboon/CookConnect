# Chef Schedules — Testcase

## Setup
- `chef_schedules` table created (scheduled_date, subscription_id, recipe_id, unique combo).
- Active subscriptions exist covering selected date.

## Cases
- [ ] C1: Open `/employee/chef`, calendar shows current month, today selected.
- [ ] C2: Click a date → customer list shows active, unpaused, day-matching subs (no date-range gate — expired subs with remaining meals still show).
- [ ] C2d: `remaining_meal_count` (trigger-maintained) shows as "N left" on cards; depleted (≤0) cards are greyed with Depleted badge + disabled picker; auto-fill skips/flags depleted; still-to-pick excludes depleted.
- [ ] C2b: Delivery-days filter — a customer with `days: ["monday","tuesday"]` appears only on Mon/Tue; `onCall` subscriptions are excluded; rows with no `days` still show every day in range. Card shows days + slot/time.
- [ ] C2c: Friday closure — Fridays always show empty (with closed-Friday note); Friday-only subs appear on Thursday with a "Friday order" badge (doubled Thursday).
- [ ] C3: Customer with no rows in `chef_schedules` shows "To pick" status, neutral progress bar.
- [ ] C4: "Set meals" opens a dialog (not inline) showing restricted ingredient names + count, and hidden-meal count + expandable hidden names.
- [ ] C4b: Dialog empty state mentions hidden-by-restriction count when nothing is available.
- [ ] C5: Recipe fetch uses `limit=60` (`/api/recipe?sort=name&limit=60`); selecting a category refetches with `&category=<value>` (dynamic server-side filter), "All" refetches unfiltered.
- [ ] C6: Meal cards render with `next/image` (optimized, lazy, fallback icon when no image).
- [ ] C7: Select meals → Save → POST `/api/chef-schedules` → status updates to `n/target` with progress bar; picked meals show as thumbnail rows.
- [ ] C8: Re-save with empty selection clears picks for that date + subscription.
- [ ] C9: `npx tsc --noEmit` clean; eslint clean on chef files.
- [ ] C10: Header has Schedule / To Cook Today tabs (same switcher style as orders POS/Orders).
- [ ] C11: To Cook Today shows portion/meal/customer totals, per-meal ×count rows with customers, and a Still-to-pick list for active subscribers without picks today.
- [ ] C12: Picker dialog shows plan counter card (plan name, meals/day allowance, selected count) + over-allowance warning when draft exceeds the plan.
- [ ] C13: Card delivery line shows `slots` joined (legacy `slot`/`time` fallback); breakfast badge on card + "+ breakfast" note in dialog counter.
- [ ] C14: Today tab has All/Morning/Noon/Evening pills below stats; meal list, totals, and still-to-pick all narrow to subscriptions carrying that slot (unknown slots show everywhere).
- [ ] C15: Paused subscriptions are excluded from Schedule/Today/Still-to-pick lists.
- [ ] C16: Picker dialog shows protein credit buckets with remaining counts (derived from whole-period picks); exhausted buckets render red.
- [ ] C17: Day setup card lists per-plan standards; Set/Edit standard saves the day's set; Auto-fill fills unpicked customers, swaps on restriction/credit conflicts, trims to remaining entitlement, and never overwrites existing picks; review dialog shows issues + Edit; Apply persists via batch.
- [ ] C18: Today meal rows show x/y cooked progress; per-row check toggles done with spinner; Mark-all/Reopen-all works.
