# CookConnect — Implementation Plan

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.10 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (via Supabase) — *not yet wired* |
| Auth | Supabase Auth — *not yet wired* |
| Maps | react-map-gl (Mapbox GL JS wrapper) |
| Animation | framer-motion |
| Backend | Next.js API Routes — *not yet created* |
| Icons | lucide-react |

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `brand-900` | `#118B50` | Primary dark green (headers, buttons, nav, primary text) |
| `brand-700` | `#C0EBA6` | Light green (hover states, highlights) |
| `brand-400` | `#79AE6F` | Medium green (secondary accents, borders) |
| `surface` | `#f2f3f7` | Page background |
| `white` | `#ffffff` | Card/surface white |
| `black` | `#150d0b` | Near-black text alternative |
| `text-primary` | `var(--color-brand-900)` | Body text |
| `text-secondary` | `#4b5563` | Muted/text-secondary |
| `border` | `#d1d5db` | Default borders |
| `border-light` | `#e5e7eb` | Light borders |

---

## Route Structure (Actual)

```
app/
├── (authenticated)/                    # Protected — checks user role, mounts Navbar
│   ├── layout.tsx                      # AuthProvider + AuthGuard + Navbar wrapper
│   ├── customer/
│   │   ├── page.tsx                    # /customer — Dashboard (stats, map image, meal plan)
│   │   └── profile/page.tsx            # /customer/profile — Edit profile
│   ├── employee/
│   │   ├── page.tsx                    # /employee — Dashboard (stats, map, quick actions, StatusGallery)
│   │   ├── customers/page.tsx          # /employee/customers — Table with search + status icons
│   │   ├── customers/[id]/page.tsx     # /employee/customers/[id] — Detail/edit
│   │   ├── subscriptions/page.tsx      # /employee/subscriptions — Gallery + create form (same page)
│   │   ├── deliveries/page.tsx         # /employee/deliveries — Map + inline edit table
│   │   └── accounts/page.tsx           # /employee/accounts — Table with filters + CSV export
│   └── rider/
│       └── page.tsx                    # /rider — Full-screen map + bottom sheet (was /rider/dashboard)
├── (unauthenticated)/                  # Public pages
│   ├── layout.tsx                      # No auth guard
│   ├── page.tsx                        # / — Landing page (server component)
│   └── login/page.tsx                  # /login — Quick-role buttons + email/password form
├── layout.tsx                          # Root layout (fonts, metadata)
└── globals.css                         # Tailwind v4 theme + base styles
```

## Components

### `components/ui/` (15 components)

| Component | Description |
|-----------|-------------|
| `Button` | Variants: primary/secondary/outline/ghost/danger; sizes: sm/md/lg |
| `Input` | Text input with optional label + error |
| `Select` | Native select with options array, label, error |
| `Card` | Wrapper with optional title |
| `Badge` | Variants: success/warning/error/info |
| `Modal` | Overlay modal with open/onClose/title/children |
| `Table` | Generic `<T>` with columns + data + onRowClick |
| `StatCard` | Icon + label + value display card |
| `DeliveryStatusItem` | Single delivery row with intent badge |
| `StatusGallery` | Paginated delivery gallery with search + intent filter |
| `ConfirmDialog` | Confirmation modal with confirm/cancel |
| `SubscriptionGallery` | Paginated subscription list with search + delete |
| `RiderMap` | Full-screen Mapbox map with GPS tracking, custom markers, popup actions, legend, style switcher |
| `MapboxMap` | Reusable Mapbox map with custom markers, legend, style switcher, popups |
| `LocationDialog` | Modal with Mapbox map + draggable marker for location picking |

### `components/layout/` (1 component)

| Component | Description |
|-----------|-------------|
| `Navbar` | Responsive nav with role-based links, hamburger menu on mobile, sign out |

## Hooks

| File | Exports |
|------|---------|
| `hooks/AuthProvider.tsx` | `AuthProvider` (default), `useAuth()` → `{ user, loading, signIn, signOut }` |

**Current state:** Mock user hardcoded as rider `R-001` (Kevin Ramos). Change `role` in AuthProvider line 27 to test employee or customer. `signIn` is a stub. `signOut` clears user to null.

## Constants

| File | Key Types | Key Data |
|------|-----------|----------|
| `customers.ts` | `Customer` | `CUSTOMERS` (6), `CUSTOMER_STATUS_OPTIONS` |
| `subscriptions.ts` | `Subscription`, `MealPlanDetail` | `SUBSCRIPTIONS` (5) |
| `deliveries.ts` | `Delivery`, `DeliveryIntent` | `DELIVERIES` (6), `RIDERS` (3), `DELIVERY_INTENT_OPTIONS` |
| `navigation.ts` | `NavItem`, `UserRole` | `NAV_ITEMS` per role |
| `accounts.ts` | `Account` | `ACCOUNTS` (10), `ROLE_OPTIONS` |

**All data is static — no API layer, no database.**

---

## Module Breakdown & Status

### Module 1: Project Scaffolding & Configuration — ✅ Complete

- Tailwind v4 theme with green palette — done
- Environment variables (`.env.local`) — done
- AuthProvider with mocked user — done
- Authenticated layout with role-based guards — done
- Shared Navbar — done
- `lib/` directory — **not created; empty**

### Module 2: Database Schema & Supabase Setup — ⏳ Partially Done

- Schema documented in `docs/database-schema.md` — done
- Supabase project — **not created**
- RLS policies — documented only
- Tables created — **not done**

### Module 3: Authentication (Supabase Auth) — ⏳ Partially Done

- Login page UI with quick-role buttons + email form — done
- AuthProvider wired to Supabase — **not done** (stub signIn/signOut)
- Session persistence — **not done**
- Role-based redirects — done (client-side in AuthGuard)

### Module 4: Employee Module — ✅ UI Complete (no API)

- `/employee` dashboard with stats, map, StatusGallery — done
- `/employee/customers` table with search, icons — done
- `/employee/customers/[id]` detail/edit page — done
- `/employee/subscriptions` gallery + create form — done
- `/employee/deliveries` map + inline edit table — done
- `/employee/accounts` table with filters + CSV export — done
- API routes — **not created**

### Module 5: Customer Module — ✅ UI Complete (no API)

- `/customer` dashboard with stats, map image, LocationDialog — done
- `/customer/profile` edit page — done
- `/customer/location` — **removed** (merged into dashboard)
- API routes — **not created**

### Module 6: Rider Module — ✅ UI Complete (no API)

- `/rider` dashboard with full-screen RiderMap, bottom sheet — done
- GPS tracking via `navigator.geolocation.watchPosition` — done
- Popup done/skip actions — done
- Legend + style switcher — done
- API routes — **not created**

### Module 7: Shared UI Components — ✅ Complete

All 15 UI components + Navbar built and used across modules.

---

## Key Decisions

- Dashboard lives at root route per role (`/employee`, `/rider`, `/customer`) — no nested `/dashboard`
- Single `profiles` table with `role` enum — no separate tables per role
- JSONB `details` column for subscriptions — flexible schema
- Subscriptions create form on same page as list — not a separate route
- Customer location managed via LocationDialog on dashboard — dedicated `/customer/location` page removed
- Rider location tracking uses browser Geolocation API (`watchPosition` + high accuracy)
- Table uses unconstrained generic `<T>` with internal casting for interface flexibility
- Login page has quick-role buttons for development/testing

---

## Gaps / Next Steps

1. **Supabase Auth** — wire signIn/signOut, session management, role-based redirects
2. **API Routes** — create REST endpoints under `app/api/`
3. **Database** — create Supabase project, run schema migrations
4. **Replace mock data** — connect pages to API layer
5. **Test files** — create testcase files per module (no test coverage exists)
6. **`lib/` directory** — create Supabase client/server helpers
7. **Middleware** — server-side route protection
8. **Update IMPLEMENTATION.md** — keep in sync with actual route structure ✅

---

## Design System Principles

- Fresh, natural, organic feel reflecting the green palette
- Clean and minimal — no `max-w-*` constraints; minimize Card usage
- Mobile-responsive (customers/riders may use phones)
- Accessible contrast ratios
- Consistent spacing, typography, and border radius
- framer-motion animations for page transitions, stat counters, list items
- Lucide icons throughout
- No emojis unless explicitly requested
