# HealthyCampaign — New Subsections

## Subsection 1: "Health Bites"
**Position:** Between banner text and "View Healthy Plan" button, inside the green gradient banner.

3 compact quick-fact cards in a horizontal row:

| Card | Text |
|------|------|
| 🌿 Energy | Meals rich in leafy greens can boost energy levels within 2 hours. |
| 🔥 Calories | Our chefs keep all meals under 500 calories—without skimping on flavor. |
| 🧠 Focus | Subscribers report a 40% increase in daily focus within the first week. |

- White `bg-white/10` cards with `backdrop-blur-sm`
- Icon + single line of text
- `rounded-xl`, `gap-4`

---

## Subsection 2: "The Fresh Pantry"
**Position:** Between banner and category tabs, right above the gallery.

Horizontally scrollable ingredient rail — 5 items:

| Image Seed | Label |
|-----------|-------|
| `quinoa` | Organic Quinoa |
| `salmon` | Wild-Caught Salmon |
| `avocado` | Fresh Avocado |
| `kale` | Farm-Grown Kale |
| `blueberries` | Seasonal Berries |

- Rounded ingredient photos (`rounded-xl`, `size-20`)
- Tiny label underneath (`text-[11px]`, `text-black/40`)
- Horizontal `flex gap-5 overflow-x-auto`
- Subtle section label: "The Fresh Pantry" with a small icon
