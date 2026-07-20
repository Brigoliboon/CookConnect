# Database Schema — CookConnect

**Tech:** PostgreSQL + PostGIS (`GEOGRAPHY(Point, 4326)`)

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Enums

```sql
CREATE TYPE user_role AS ENUM ('customer', 'rider', 'employee');
CREATE TYPE delivery_intent AS ENUM ('today', 'skip', 'delivered');
```

---

## Tables

### `profiles`

Unified table for all user roles (customer, rider, employee).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | `gen_random_uuid()` |
| `name` | `TEXT NOT NULL` | |
| `email` | `TEXT NOT NULL UNIQUE` | |
| `phone` | `TEXT` | |
| `role` | `user_role NOT NULL` | |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` | |
| `address` | `TEXT` | |
| `location` | `GEOGRAPHY(Point, 4326)` | PostGIS spatial point |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Indexes:**
- `idx_profiles_role` on `(role)`
- `idx_profiles_location` GIST on `(location)`
- `idx_profiles_is_active` on `(is_active)`

---

### `subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | `gen_random_uuid()` |
| `customer_id` | `UUID FK -> profiles(id) ON DELETE CASCADE` | |
| `details` | `JSONB NOT NULL DEFAULT '{}'` | `mealsPerWeek`, `servingsPerMeal`, `dietaryPreference`, `includedMeals`, `notes` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Indexes:**
- `idx_subscriptions_customer` on `(customer_id)`

---

### `deliveries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | `gen_random_uuid()` |
| `customer_id` | `UUID FK -> profiles(id) ON DELETE CASCADE` | |
| `rider_id` | `UUID FK -> profiles(id) ON DELETE SET NULL` | nullable |
| `subscription_id` | `UUID FK -> subscriptions(id) ON DELETE CASCADE` | |
| `intent` | `delivery_intent NOT NULL DEFAULT 'today'` | `today` / `skip` / `delivered` |
| `note` | `TEXT NOT NULL DEFAULT ''` | customer note |
| `location` | `GEOGRAPHY(Point, 4326)` | delivery point |
| `address` | `TEXT NOT NULL DEFAULT ''` | |
| `scheduled_date` | `DATE NOT NULL` | |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Indexes:**
- `idx_deliveries_customer` on `(customer_id)`
- `idx_deliveries_rider` on `(rider_id)`
- `idx_deliveries_intent` on `(intent)`
- `idx_deliveries_date` on `(scheduled_date)`
- `idx_deliveries_location` GIST on `(location)`

---

## Row-Level Security

### `profiles`
| Policy | Role | Action |
|--------|------|--------|
| `employees_all_profiles` | employee | ALL |
| `customers_read_own_profile` | customer | SELECT (own) |
| `customers_update_own_profile` | customer | UPDATE (own) |

### `subscriptions`
| Policy | Role | Action |
|--------|------|--------|
| `employees_all_subscriptions` | employee | ALL |
| `customers_read_own_subscription` | customer | SELECT (own) |

### `deliveries`
| Policy | Role | Action |
|--------|------|--------|
| `employees_all_deliveries` | employee | ALL |
| `customers_read_own_deliveries` | customer | SELECT (own) |
| `riders_read_assigned_deliveries` | rider | SELECT (assigned only) |
| `riders_update_assigned_delivery` | rider | UPDATE (assigned only) |

---

## Spatial Queries

### Find deliveries within 5 km of a rider

```sql
SELECT * FROM deliveries
WHERE ST_DWithin(
  location,
  (SELECT location FROM profiles WHERE id = 'rider-uuid'),
  5000
)
AND intent = 'today'
AND scheduled_date = CURRENT_DATE;
```

### Nearest customers to a point

```sql
SELECT id, name, address,
  ST_Distance(location, ST_MakePoint(121.0, 14.6)::geography) AS distance_m
FROM profiles
WHERE role = 'customer' AND is_active = true
ORDER BY location <-> ST_MakePoint(121.0, 14.6)::geography
LIMIT 10;
```
