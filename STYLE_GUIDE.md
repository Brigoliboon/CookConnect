# Style Guide — CookConnect

## Typography

| Usage | Font | CSS Variable |
|-------|------|-------------|
| Default body | Open Sans | `--font-sans` |
| Hero / large headings | Playfair Display | `--font-playfair` |
| Details / body copy | Nunito Sans | `--font-nunito` |
| Monospace | Geist Mono | `--font-mono` |

### Sizing patterns
- Hero headings: `text-5xl` – `text-7xl`, `font-medium`, Playfair
- Section headers: `text-4xl` – `text-5xl`, `font-medium`, Playfair
- Category titles: `text-2xl` – `text-3xl`, `font-medium`, Playfair
- Body / descriptions: `text-sm`, Nunito
- Labels / badges: `text-[11px]`, `uppercase`, `tracking-[0.3em]`, Nunito
- Macros / price: `text-sm` – `text-base`, Nunito

---

## Color Palette (Minimal)

### Theme tokens

```
--color-black:       #150d0b
--color-white:       #ffffff
--color-surface:     #f2f3f7
--color-text-secondary: #4b5563
--color-border:      #d1d5db
--color-border-light: #e5e7eb
```

### Dark mode overrides
```
--color-surface-dark:       #121212
--color-white-dark:         #1e1e1e
--color-black-dark:         #f5f5f5
--color-text-secondary-dark: #a3a3a3
--color-border-dark:        #333333
--color-border-light-dark:  #2a2a2a
```

### Macro colors (used in nutrition panels)
```
--color-macro-protein: #FA6868
--color-macro-carbs:   #5A9CB5
--color-macro-fat:     #FACE68
```

Additional nutrition: fiber `#79AE6F`, sugar `#E9C46A`, sodium `#7B5EA7`

### Text opacity scale (light text on dark backgrounds)
| Opacity | Usage |
|---------|-------|
| `text-white/90` | Primary content (name) |
| `text-white/70` | Secondary content (description) |
| `text-white/50` | Tertiary content (price, meta) |
| `text-white/40` | Macros, subtle labels |
| `text-white/30` | Low-priority info |
| `text-white/10` | Dividers, borders |

---

## Layout Principles

1. **No `max-w-*` or `mx-auto`** unless explicitly specified — prefer full-width with padding
2. **No centered containers** — full-bleed layouts
3. **Padding**: `px-8` for sides, `py-24` to `py-32` for sections
4. **No unnecessary bordered card containers** — use bg + shadow or bg + border variants

---

## Component Patterns

### Cards (MealCard on landing)
```
Rounded-2xl image with overflow-hidden
Overlapping detail panel (-mt-16) with:
  - backdrop-blur-sm + bg-white/10 (glass effect)
  - Rounded-2xl with border-white/10
  - pt-20 top padding (accommodates overlap)
Entrance: 1.25s delay after viewport entry
  - Image shrinks to 70% width + 0.85 scale
  - Detail slides up (y: 20 → 0, opacity: 0 → 1)
Hover on image:
  - Image scales back to 100%
  - Detail collapses (hidden)
Hover on detail:
  - Cart button fades in (group-hover/detail)
```

### Dialog (MealDetailDialog)
```
White bg, rounded-2xl, shadow-2xl
Image header with gradient overlay (from-black/60 to transparent)
Spring animation (stiffness: 280, damping: 26)
Nutrition panel (classic rows, not charts):
  - Colored rounded squares per macro
  - Border-t/b with divide-y
Ingredients section: rounded-full pill badges
Barcode: bars generated from item ID
Footer: "Per serving · Made fresh to order"
```

### Hero Section
```
Full-screen min-h-screen
Background image with gradient overlay
2-column top row (text left, sample menu image right)
Bottom row: horizontal scrollable gallery (overflow-x-auto)
Transparent fixed nav with white text
```

### Nav
```
Fixed top, transparent (no bg)
White text with opacity variants
Theme toggle (sun/moon) button
Cart icon button
Links: Menu, Pricing, About, Contact
Sign In button (solid white bg, black text)
```

---

## Animation Guidelines

All animations via **Framer Motion**.

### Easing
```ts
ease: [0.25, 0.1, 0.25, 1]  // custom cubic bezier
```

### Entrance patterns
- Fade + slide up (`opacity: 0, y: 30` → `opacity: 1, y: 0`)
- Staggered children (0.15s – 0.2s stagger)
- `viewport: {{ once: true, margin: "-50px" }}` for scroll-triggered
- `transition: {{ duration: 0.5–0.7 }}`

### Card sequence
1. Parent container enters (fade up)
2. After 1.25s delay: image shrinks, detail panel slides up
3. On image hover: image expands back, detail hides
4. On detail hover: cart button fades in

### Hover effects
- Image scale: `group-hover:scale-105` (CSS)
- Detail panel popup: mouseEnter/mouseLeave on image div
- Cart button: `group-hover/detail:opacity-100`

---

## Dialog State (NewMealDialog)
- Opened/closed via `AnimatePresence`
- State reset on close (all form fields)
- Category dropdown, ingredient search (FatSecret API), price + DH
- Calculate button sums macros → displays as donut chart + nutrition rows

---

## Dark Mode
- Class-based: `.dark` on `<html>` element
- `@custom-variant dark (&:where(.dark, .dark *))` in CSS
- localStorage persistence + system preference detection
- Script in `<head>` prevents FOUC
- Theme toggle in Nav (Sun/Moon icon)
