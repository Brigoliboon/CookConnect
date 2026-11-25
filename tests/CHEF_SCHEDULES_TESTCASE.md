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
- [ ] C12: Picker dialog shows plan counter card (plan name, meals/day allowance, selected count) + over-allowance warning when draft exceeds the plan. The warning does not block saving.
- [ ] C13: Card delivery line shows `slots` joined (legacy `slot`/`time` fallback); breakfast badge on card + "+ breakfast" note in dialog counter.
- [ ] C14: Today tab has All/Morning/Noon/Evening pills below stats; meal list, totals, and still-to-pick all narrow to subscriptions carrying that slot (unknown slots show everywhere).
- [ ] C15: Paused subscriptions are excluded from Schedule/Today/Still-to-pick lists.
- [ ] C16: Picker dialog shows protein credit buckets with remaining counts (derived from whole-period picks); exhausted buckets render red.
- [ ] C17: Day setup card lists per-plan standards; Set/Edit standard saves the day's set; Auto-fill fills unpicked customers, swaps on restriction/credit conflicts, trims to remaining entitlement, and never overwrites existing picks; review dialog shows issues + Edit; Apply persists via batch.
- [ ] C18: Today meal rows show x/y cooked progress; per-row check toggles done with spinner; Mark-all/Reopen-all works.
- [ ] C19: Manual override above the plan: on a 3/day plan, pick 5 and save. The Plates list shows `5/3 set` (blue, tooltip "2 over the plan allowance"), not `3/3`. Re-opening Edit shows all 5 selected.
- [ ] C20: The 2 extra meals are deducted like normal picks: `remaining_meal_count` drops by 5 in total (not 3), and the protein credit buckets in the picker reflect all 5 after reopening.
- [ ] C21: Picking fewer than the plan (2/3) saves and the list shows `2/3 set` (amber, not complete). Auto-fill still skips any customer who already has picks.
- [ ] C22: Customer with a breakfast extra (3 meals + breakfast): Edit shows the breakfast already selected, saving without touching it keeps the breakfast row, and the list reads `4/4 set`. Drinks/cakes add-ons are not counted in x/y.
- [ ] C23: When the draft would take remaining meals below 0, the picker shows the red "Only N meals remain overall" note. Record whether the save succeeds or the database rejects it.
- [ ] C24: Schedule tab, Plates section: a "Search subscribers..." bar sits above the list. Typing part of a customer's name (or email, any word order, any case) narrows the list; the footer reads `N of M plates`; the X clears it; a query with no match shows "No subscribers match ...".
- [ ] C25: Searching in Plates does not change what is saved: Set/Edit on a filtered row works, and Auto-fill still fills every unpicked customer of the day, not only the visible ones.
- [ ] C26: Suggested-meals (Review batch) dialog: after Auto-fill, the Plates block has its own search bar. It filters the per-customer rows, shows "Showing X of Y customers. Apply batch still saves all N.", and Apply batch still applies the whole batch. Opening a new review starts with an empty search.
- [ ] C27: Desktop (md and wider): in the Review batch drawer, "Cook these" shows one dish per row with the picture, the full meal name (long names wrap to two lines), the portion line and the count. No dish is squeezed to a letter. On a tablet-width bottom sheet (640 to 767px) it shows two columns; on a phone, one.
