# Meal Modifiers — Testcase

Scope: FR-50 / M16 v1. A meal can be attached to reusable single-select modifier
groups (for example "Choose your side"). When a group is attached it is required:
the customer must pick exactly one active option. Multi-select and optional groups
are not in v1. The charged price is the option's add-on price (`price_cents`,
0 = free), not the option recipe's menu price. Orders snapshot the chosen group,
option, price, side `recipe_id`, and English and Arabic names.

Modifiers apply to regular orders, the cart, and POS. Groups may be attached to
`is_subscription_included` meals. Subscription and Chef flows ignore those groups
and use the base meal with no add-ons. Meal CSV import is out of v1 (FR-48 stays
separate).

A meal with an attached active group that has no active options cannot be ordered
until an active option is added or the group is detached or deactivated.

The experimental `recipe_addons` / `order_item_addons` tables stay in place.
Historical orders keep rendering through a compatibility read of `order_item_addons`.
Drop those tables only in a later follow-up after rows are copied.

To delete a side recipe used as an option: deactivate or unlink the option first
(`recipe_id` on options is `ON DELETE RESTRICT`). Historical snapshot `recipe_id`
values become null (`ON DELETE SET NULL`).

Run on staging or locally against a test meal, after
`20261124000000_meal_modifiers.sql` is applied. Replace `<meal_id>` / ids as needed.
Schema and RPC checks (S) can be run as soon as the migration is applied; G–O wait
on later API and UI pull requests.

## S — Schema and RPC (this migration)

Role checks in this migration use only the `user_role` values `employee` and `admin`. There is no `chef` or `rider` value on that enum. Snapshot staff reads use `is_employee_or_admin()`; customer reads use `orders.customer_id`, not a role literal.

- [ ] **S1** `meal_modifier_groups` has no `selection_type` or `is_required` column
- [ ] **S2** Attaching a group to a recipe with `is_subscription_included = true` succeeds
- [ ] **S3** Setting `is_subscription_included = true` on a meal that already has a group succeeds
- [ ] **S4** A second `is_default = true` in the same group clears the previous default in the same transaction (trigger `meal_modifier_options_one_default`)
- [ ] **S5** Two active options in the same group with the same name, differing only by case, are rejected; an inactive option does not block reusing the name
- [ ] **S6** Deleting a recipe still referenced by `meal_modifier_options.recipe_id` is rejected until the option is unlinked or removed
- [ ] **S7** `create_order_with_modifiers` with a required group and no option → error, no order row left behind
- [ ] **S8** `create_order_with_modifiers` prices `base serving cents + option price_cents`, ignores client unit prices, and sets `vat_cents` to 5% of that subtotal (AED cents)
- [ ] **S9** The snapshot row includes `recipe_id`, `option_name_ar` / `group_name_ar`, and `price_cents`
- [ ] **S10** Direct `INSERT` into `order_item_modifiers` as `anon` or `authenticated` is denied; the RPC (security definer) can write
- [ ] **S11** Public/anon reads do not see inactive groups, inactive options, or links to inactive groups; an employee read does
- [ ] **S12** A meal with an attached active group that has zero active options cannot be ordered (`create_order_with_modifiers` errors, no partial order)

Groups may be sides or non-recipe choices such as spice level; option `recipe_id` may be null and `price_cents` may be 0. The add-to-cart / POS picker dialog is covered in later C / POS cases, not this editor PR.

## G — Groups and options (employee)

- [ ] **G1** `POST /api/meal-modifiers/groups` as employee → 201 with `id`
- [ ] **G2** Same request as anonymous/customer → 401/403
- [ ] **G3** Name/name_ar trimmed; empty name → 400
- [ ] **G4** `PATCH /api/meal-modifiers/groups/{id}` updates name, name_ar, is_active, sort_order (there is no `is_required` or `selection_type` field)
- [ ] **G5** `DELETE /api/meal-modifiers/groups/{id}` removes the group and its options/links
- [ ] **G6** `POST /api/meal-modifiers/options` with `group_id`, `name`, `price_cents`, optional `recipe_id`, `name_ar`, `is_default`, `sort_order` → 201
- [ ] **G7** Negative `price_cents` or missing `name`/`group_id` → 400
- [ ] **G8** Unknown `recipe_id` → 400/404
- [ ] **G9** A second `is_default=true` in the same group replaces the previous default (one default per group, same transaction)
- [ ] **G10** `PATCH`/`DELETE` option by id works and is employee-only
- [ ] **G11** Add-on price is independent of the recipe's serving price: a biryani rice with a menu price can be `price_cents: 0` (free add-on)
- [ ] **G12** Employee list endpoints include inactive groups and options; the public `GET` does not

## A — Attachments

- [ ] **A1** `PUT /api/meal-modifiers/links` with `{ meal_recipe_id, group_ids: [...] }` replaces the meal's attached groups
- [ ] **A2** Attaching the same group twice keeps one link (unique meal/group)
- [ ] **A3** Unknown meal or group id → 400/404
- [ ] **A4** Deleting a group removes it from every attached meal
- [ ] **A5** `GET /api/meal-modifiers?meal_id=<meal_id>` returns active groups and active options in `sort_order`, public
- [ ] **A6** `GET` without `meal_id` → 400; unknown meal → `{ data: [] }`
- [ ] **A7** Attaching a group to an `is_subscription_included` meal succeeds; subscription flows still ignore the group

## P — Server pricing and validation (`create_order_with_modifiers`)

- [ ] **P1** Order item for a meal with a required group and no modifier → error, no order created
- [ ] **P2** Modifier option not in an attached group → error
- [ ] **P3** Two options for one group → error
- [ ] **P4** Inactive option or inactive group → error (treated as invalid)
- [ ] **P5** Price = base serving price + option `price_cents`; client-supplied prices are ignored; `vat_cents` is 5% of the server subtotal in AED cents
- [ ] **P6** Free option (`price_cents: 0`) adds nothing even when the side recipe has a menu price
- [ ] **P7** Two attached groups on one meal each require exactly one option; the line price is the base plus both add-ons (multi-select within a group is not in v1 and is rejected)
- [ ] **P8** Order, items, and modifier snapshots commit together in `create_order_with_modifiers`; a failed modifier write leaves no partial order
- [ ] **P9** Attached active group with zero active options → error, no order created

## C — Customer surfaces

- [ ] **C1** Menu meal card: adding a meal with a required group opens the picker and blocks add until one option is chosen
- [ ] **C2** Picker shows EN labels on `/en` and AR labels on `/ar` (falls back to EN when `name_ar` empty)
- [ ] **C3** Landing cart: changing the side updates the line total, subtotal, VAT, and total before submit
- [ ] **C4** Same meal with two different options creates two cart lines; same options merge quantities
- [ ] **C5** POS line picker uses the same groups/options and includes the add-on price in the line total
- [ ] **C6** Meal with no attached groups adds directly with no picker

## O — Order display

- [ ] **O1** Order details panel lists each item's chosen modifiers with the price (or "Free")
- [ ] **O2** Staff email for a new order includes modifier names
- [ ] **O3** Receipt/print output includes modifier names
- [ ] **O4** Editing or deleting a group/option after an order does not change that order's snapshot (names and price stay; `recipe_id` may become null if the side recipe is later deleted)
- [ ] **O5** Historical orders that only have `order_item_addons` rows still render through the compatibility read after the new modifier UI ships. The old tables are not dropped in v1.
- [ ] **O6** Public order tracking shows the snapshotted modifier labels
