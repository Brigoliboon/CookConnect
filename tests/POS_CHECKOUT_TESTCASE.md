# POS Compact Checkout — Testcase

Scope: `components/pos/PosTerminal.tsx` (FR-25). The category header card above the items list is gone, and the checkout panel keeps its setup rows short so the order lines are visible without scrolling.

Run date: 2026-11-26 · `npx tsc --noEmit` clean · eslint clean on the file · `npm run build` not run (the sandbox cannot reach Google Fonts).

## H — Harness (old vs new component, 1366x768, three lines in the cart, no Mapbox token)

- [x] **H1** First menu card top: 226px before, 152px after (74px reclaimed).
- [x] **H2** Dine-in: first order line at 395px before, 338px after.
- [x] **H3** Pickup: first order line at 395px before, 342px after (name and mobile share one row).
- [x] **H4** Delivery: first order line at 792px before (below the 768px fold, behind the map), 384px after.
- [x] **H5** Totals and Place Order footer stay pinned at the same height in both versions; the order lines are the only scrolling part.

## B — Browser, real data (NOT run yet)

- [ ] **B1** Items list: no category title card above the grid for any category chip or search; the grid starts right under the search/category bar. A search with no results still shows "No items found".
- [ ] **B2** Dine-in: one dashed "Walk-in customer / Add details" row. Click: name and mobile appear on one row and the row reads "Hide". Fill them, hide the row: it shows the name and `+971 ...` and "Edit". A dine-in order with no details still places.
- [ ] **B3** Pickup: name and mobile show at once on one row; Place Order stays disabled until both are valid (same rule as before).
- [ ] **B4** Delivery: one "Delivery location * / Set on map" row. Click opens the "Delivery location" modal with the map. Pick a point, "Confirm location": the modal closes and the row turns green with the address and "Change". The delivery fee appears in the totals.
- [ ] **B5** Delivery outside the zone: the modal shows the red "Outside delivery area" box and stays open; after closing it, the row is red and Place Order stays disabled.
- [ ] **B6** Reopen the modal after confirming and move the pin: the confirmation resets (row goes back to "Delivery location *" until re-confirmed) and the fee is cleared.
- [ ] **B7** Switching Dine-in / Pickup / Delivery keeps the cart, clears the delivery pin and address, as before.
- [ ] **B8** After a successful order the cart, contact fields, the dine-in row (folded again) and the delivery state are all reset.
- [ ] **B9** The map renders and the pin can be dragged inside the modal with a real Mapbox token (the modal has no map in the sandbox).
- [ ] **B10** Mobile and tablet widths: open the cart drawer, switch to Delivery, open the modal: it sits above the drawer, scrolls inside on a short screen, and can be closed by the backdrop and the X.
- [ ] **B11** Keyboard: the dine-in row and the location row are reachable by Tab and toggle with Enter/Space; `aria-expanded` follows the dine-in row.
