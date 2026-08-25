# Menu Population Guide

## Overview

This guide covers the complete process of populating restaurant menu items into the Supabase database via curl API calls, with nutrition data sourced from FatSecret.

## Prerequisites

### 1. Authentication Cookie

All API calls require a Supabase auth cookie. Get it from browser DevTools:

1. Log into the app at `http://localhost:3000`
2. Open DevTools → Application → Cookies
3. Copy the value of `sb-bzjgwyvchazazhgassxc-auth-token`

Cookie format:
```
Cookie: sb-bzjgwyvchazazhgassxc-auth-token=base64-eyJhY2Nlc3NfdG9rZW4iOi...
```

### 2. FatSecret API

Available at `http://localhost:3000/api/fatsecret/search`

Endpoint: `GET /api/fatsecret/search?search_expression=<query>&max_results=<n>`

Returns nutrition per 100g or per serving size.

---

## Database Schema

```
recipes
├── id (uuid, auto)
├── name (string)
├── category (string: chicken|beef|seafood|salad|wrap|breakfast|pasta|soup|pizza|burgers|drinks|biryani|risotto)
├── description (string)
├── is_active (boolean)
└── image_path (string, nullable)

servings
├── id (uuid, auto)
├── recipe_id (uuid, FK → recipes)
├── name (string, e.g., "Regular")
├── price (number)
├── calories (number)
├── nutrition (jsonb)
└── is_active (boolean)

serving_ingredients
├── serving_id (uuid, FK → servings)
├── ingredient_id (uuid, FK → ingredients)
├── quantity_g (number)
└── unit (string, nullable)

ingredients
├── id (uuid, auto)
├── name (string)
├── nutrition (jsonb)
└── fatsecret_id (string, nullable)
```

---

## Workflow

### Step 1: Search FatSecret for Ingredients

Search for each ingredient to get nutrition data. Limit results to save context.

```bash
# Search for specific ingredients (use max_results=1 for common items)
curl -s "http://localhost:3000/api/fatsecret/search?search_expression=shrimp&max_results=1"

# For generic items, search by food name
curl -s "http://localhost:3000/api/fatsecret/search?search_expression=basmati+rice&max_results=1"

# For branded items, search specifically
curl -s "http://localhost:3000/api/fatsecret/search?search_expression=arborio+rice&max_results=1"
```

**Response format:**
```json
{
  "foods": {
    "food": {
      "food_description": "Per 100g - Calories: 146kcal | Fat: 5.93g | Carbs: 0.00g | Protein: 21.62g",
      "food_id": "2057",
      "food_name": "Salmon",
      "food_type": "Generic"
    }
  }
}
```

**Parsing nutrition from description:**
- `Per 100g` → values are per 100g
- `Per 1 cup` → convert to grams (1 cup ≈ 185g for rice)
- `Per 1 tsp` → convert to grams (1 tsp ≈ 5g)

### Step 2: Create Recipe

```bash
curl -s -X POST "http://localhost:3000/api/recipe" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-bzjgwyvchazazhgassxc-auth-token=<YOUR_COOKIE>" \
  -d '{
    "name": "Recipe Name",
    "category": "biryani",
    "description": "Description of the dish"
  }'
```

**Response:**
```json
{
  "id": "2becc003-f39d-4f8e-b398-133dd540ac86",
  "name": "Recipe Name",
  "category": "biryani",
  "servings": []
}
```

Save the `id` for the next step.

### Step 3: Create Serving with Ingredients

```bash
curl -s -X POST "http://localhost:3000/api/recipe/<RECIPE_ID>/servings" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-bzjgwyvchazazhgassxc-auth-token=<YOUR_COOKIE>" \
  -d '{
    "name": "Regular",
    "price": 35,
    "calories": 640,
    "nutrition": {
      "protein_g": 35,
      "carbs_g": 75,
      "fats_g": 22,
      "fiber_g": 4,
      "sugar_g": 5,
      "sodium_mg": 850
    },
    "ingredients": [
      {
        "name": "Basmati Rice",
        "quantity_g": 180,
        "unit": "g",
        "nutrition": {
          "calories_per_100g": 124,
          "protein_g": 2.7,
          "carbs_g": 24.9,
          "fats_g": 1.6,
          "fiber_g": 0.4,
          "sugar_g": 0,
          "sodium_mg": 1
        },
        "fatsecret_id": "34157681"
      },
      {
        "name": "Shrimp",
        "quantity_g": 100,
        "unit": "g",
        "nutrition": {
          "calories_per_100g": 144,
          "protein_g": 27.5,
          "carbs_g": 1.2,
          "fats_g": 2.3,
          "fiber_g": 0,
          "sugar_g": 0,
          "sodium_mg": 111
        },
        "fatsecret_id": "2178"
      }
    ]
  }'
```

**Key fields:**
- `name`: Serving name (e.g., "Regular", "Large")
- `price`: Price in AED
- `calories`: Total calories for the serving
- `nutrition`: Macro breakdown (per serving)
- `ingredients`: Array of ingredients with quantities

---

## Ingredient Nutrition Format

Each ingredient in the `ingredients` array should have:

```json
{
  "name": "Ingredient Name",
  "quantity_g": 100,
  "unit": "g",
  "nutrition": {
    "calories_per_100g": 146,
    "protein_g": 21.6,
    "carbs_g": 0,
    "fats_g": 5.9,
    "fiber_g": 0,
    "sugar_g": 0,
    "sodium_mg": 44
  },
  "fatsecret_id": "2057"
}
```

**Notes:**
- `fatsecret_id`: Optional, but useful for tracking source
- `nutrition`: Values per 100g, used for display and calculations
- `quantity_g`: Actual amount in the recipe

---

## What to Skip from FatSecret

Per project rules, skip these from FatSecret searches:
- **Spices/seasonings**: Biryani Spices, Ginger-Garlic Paste, Saffron, etc.
- **Processed items**: Use simplified nutrition or skip entirely
- **Sauces**: Search as-is without breaking down components

Example ingredients to skip:
```json
{
  "name": "Biryani Spices",
  "quantity_g": 10,
  "unit": "g",
  "nutrition": null,
  "fatsecret_id": null
}
```

---

## Saving Context Tips

### 1. Batch Similar Items

When creating multiple variants of the same dish (e.g., Biryani with different proteins):
- Create all recipes first
- Then create servings in parallel if possible
- Reuse common ingredient nutrition data

### 2. Limit FatSecret Searches

```bash
# Good: Search for specific item
curl -s "http://localhost:3000/api/fatsecret/search?search_expression=shrimp&max_results=1"

# Bad: Search with too many results
curl -s "http://localhost:3000/api/fatsecret/search?search_expression=shrimp&max_results=10"
```

### 3. Reuse Nutrition Data

Common ingredients appear in many recipes. Cache their nutrition:
- Basmati Rice: `fatsecret_id: 34157681`
- Shrimp: `fatsecret_id: 2178`
- Chicken: `fatsecret_id: 510`
- Beef: `fatsecret_id: 1392`
- Salmon: `fatsecret_id: 2057`
- Onion: `fatsecret_id: 36442`
- Yogurt: `fatsecret_id: 845`
- Tomato: `fatsecret_id: 6138`
- Ghee: `fatsecret_id: 369401`
- Parmesan: `fatsecret_id: 3656`
- Arborio Rice: `fatsecret_id: 1348968`

### 4. Use meals.csv as Source of Truth

The `meals.csv` file contains:
- Category and item names
- Variant/protein options
- Serving sizes
- Prices
- Detailed ingredient lists with grams
- Nutrition columns (currently 0s - populate from FatSecret)

---

## Example: Complete Recipe Creation

### Biryani Chicken (from meals.csv)

**CSV row:**
```
Biryani & Risotto,Biryani,Chicken,Standard,32,"Basmati Rice (180g), Chicken (120g), Onion (40g), Yogurt (30g), Tomato (20g), Biryani Spices (10g), Ginger-Garlic Paste (10g), Saffron (1g), Mint (5g), Coriander (5g), Ghee (15g)"
```

**Step 1: Search FatSecret for proteins**
```bash
curl -s "http://localhost:3000/api/fatsecret/search?search_expression=chicken&max_results=1"
# → 165kcal per 100g, 31g protein, 3.6g fat
```

**Step 2: Create recipe**
```bash
curl -s -X POST "http://localhost:3000/api/recipe" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-bzjgwyvchazazhgassxc-auth-token=<COOKIE>" \
  -d '{
    "name": "Chicken Biryani",
    "category": "biryani",
    "description": "Aromatic spiced rice dish prepared with your choice of protein"
  }'
```

**Step 3: Create serving with all ingredients**
```bash
curl -s -X POST "http://localhost:3000/api/recipe/<RECIPE_ID>/servings" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-bzjgwyvchazazhgassxc-auth-token=<COOKIE>" \
  -d '{
    "name": "Regular",
    "price": 32,
    "calories": 640,
    "ingredients": [
      {"name": "Basmati Rice", "quantity_g": 180, "unit": "g", "nutrition": {...}, "fatsecret_id": "34157681"},
      {"name": "Chicken", "quantity_g": 120, "unit": "g", "nutrition": {...}, "fatsecret_id": "510"},
      {"name": "Onion", "quantity_g": 40, "unit": "g", "nutrition": {...}, "fatsecret_id": "36442"},
      {"name": "Yogurt", "quantity_g": 30, "unit": "g", "nutrition": {...}, "fatsecret_id": "845"},
      {"name": "Tomato", "quantity_g": 20, "unit": "g", "nutrition": {...}, "fatsecret_id": "6138"},
      {"name": "Biryani Spices", "quantity_g": 10, "unit": "g", "nutrition": null},
      {"name": "Ginger-Garlic Paste", "quantity_g": 10, "unit": "g", "nutrition": null},
      {"name": "Saffron", "quantity_g": 1, "unit": "g", "nutrition": null},
      {"name": "Mint", "quantity_g": 5, "unit": "g", "nutrition": {...}},
      {"name": "Coriander", "quantity_g": 5, "unit": "g", "nutrition": {...}},
      {"name": "Ghee", "quantity_g": 15, "unit": "g", "nutrition": {...}, "fatsecret_id": "369401"}
    ]
  }'
```

---

## Verification

After creating recipes, verify they exist:

```bash
# List all recipes
curl -s "http://localhost:3000/api/recipe" \
  -H "Cookie: sb-bzjgwyvchazazhgassxc-auth-token=<COOKIE>" | jq '.[].name'

# Check specific recipe
curl -s "http://localhost:3000/api/recipe/<RECIPE_ID>" \
  -H "Cookie: sb-bzjgwyvchazazhgassxc-auth-token=<COOKIE>" | jq '.servings[0].ingredients'
```

---

## Troubleshooting

### 401 Unauthorized
- Cookie expired or incorrect
- Get fresh cookie from browser

### 400 Bad Request
- Missing required fields (name is required)
- Invalid JSON body

### 500 Internal Server Error
- Check server logs
- Verify Supabase connection

### Ingredient not found
- FatSecret may not have exact item
- Use generic equivalent or skip

---

## File References

- `meals.csv`: Source data for all menu items
- `constants/menu.ts`: Menu categories and types
- `app/api/recipe/route.ts`: Recipe CRUD API
- `app/api/recipe/[id]/servings/route.ts`: Serving CRUD API
- `app/api/fatsecret/search/route.ts`: FatSecret proxy
- `lib/supabase/tables/recipes.ts`: Recipe database functions
- `lib/supabase/tables/servings.ts`: Serving database functions
- `lib/supabase/tables/ingredients.ts`: Ingredient upsert functions
