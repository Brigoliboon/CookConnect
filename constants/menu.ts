export interface MenuItem {
  id: string
  name: string
  category: MenuCategory
  description: string
  price: number
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
  sugar: number
  sodium: number
  ingredients: {
    name: string
    quantity_g: number
    unit: string | null
    nutrition?: {
      fats_g: number
      carbs_g: number
      fiber_g: number
      sugar_g: number
      protein_g: number
      sodium_mg: number
      calories_per_100g: number
    } | null
    fatsecret_id?: string | null
  }[]
  image_path: string | null
  servings?: MealServingOption[]
}

export interface MealServingOption {
  id: string
  name: string | null
  price: number | null
  calories: number | null
  nutrition: {
    protein_g?: number | null
    carbs_g?: number | null
    fats_g?: number | null
    fiber_g?: number | null
    sugar_g?: number | null
    sodium_mg?: number | null
  } | null
  is_active: boolean
}

export type MenuCategory =
  | "chicken"
  | "beef"
  | "seafood"
  | "salad"
  | "wrap"
  | "breakfast"
  | "pasta"
  | "soup"
  | "pizza"
  | "burgers"
  | "drinks"
  | "biryani"
  | "risotto"

export const MENU_CATEGORIES: { label: string; value: MenuCategory }[] = [
  { label: "Chicken", value: "chicken" },
  { label: "Beef", value: "beef" },
  { label: "Seafood", value: "seafood" },
  { label: "Salads", value: "salad" },
  { label: "Wraps / Snacks", value: "wrap" },
  { label: "Breakfast", value: "breakfast" },
  { label: "Pasta", value: "pasta" },
  { label: "Soup", value: "soup" },
  { label: "Pizza", value: "pizza" },
  { label: "Burgers 'n Fries", value: "burgers" },
  { label: "Drinks", value: "drinks" },
  { label: "Biryani", value: "biryani" },
  { label: "Risotto", value: "risotto" },
]

type RawMenuItem = Omit<MenuItem, "ingredients"> & { ingredients: string[] }

export const MENU_ITEMS: MenuItem[] = ([
  // Chicken (10)
  { id: "CHK-01", name: "Grilled Lemon Herb Chicken", category: "chicken", description: "Tender chicken breast marinated in fresh lemon juice, garlic, and a medley of Mediterranean herbs, then grilled over an open flame for a smoky char and juicy finish.", price: 32, calories: 380, protein: 42, carbs: 10, fats: 18, fiber: 1, sugar: 2, sodium: 520,
    ingredients: ["Chicken Breast", "Olive Oil", "Garlic", "Lemon", "Herbs", "Salt"],
},
  { id: "CHK-02", name: "Butter Chicken", category: "chicken", description: "Succulent chicken simmered in a rich, velvety tomato-cream sauce infused with butter, fenugreek, garam masala, and traditional Indian spices.", price: 35, calories: 450, protein: 35, carbs: 25, fats: 22, fiber: 3, sugar: 6, sodium: 680,
    ingredients: ["Chicken Thighs", "Butter", "Tomato Puree", "Cream", "Fenugreek", "Garam Masala"],
},
  { id: "CHK-03", name: "Chicken Shawarma Plate", category: "chicken", description: "Thinly sliced chicken marinated in Middle Eastern spices, stacked and roasted on a vertical spit, served over fragrant rice with creamy garlic toum and grilled vegetables.", price: 38, calories: 520, protein: 32, carbs: 45, fats: 24, fiber: 2, sugar: 3, sodium: 780,
    ingredients: ["Chicken Thighs", "Yogurt", "Garlic", "Spices", "Rice", "Tahini"],
},
  { id: "CHK-04", name: "Teriyaki Chicken", category: "chicken", description: "Juicy chicken thighs glazed in a house-made teriyaki sauce with soy, mirin, ginger, and garlic, served over steamed rice with a side of sautéed vegetables.", price: 34, calories: 410, protein: 38, carbs: 28, fats: 16, fiber: 2, sugar: 8, sodium: 740,
    ingredients: ["Chicken Thighs", "Soy Sauce", "Mirin", "Ginger", "Garlic", "Sesame"],
},
  { id: "CHK-05", name: "Chicken Parmesan", category: "chicken", description: "Crispy breaded chicken cutlet topped with classic marinara sauce, melted mozzarella and parmesan, served over a bed of spaghetti.", price: 36, calories: 480, protein: 36, carbs: 30, fats: 24, fiber: 3, sugar: 5, sodium: 820,
    ingredients: ["Chicken Breast", "Breadcrumbs", "Marinara", "Mozzarella", "Parmesan", "Spaghetti"],
},
  { id: "CHK-06", name: "Honey Garlic Chicken", category: "chicken", description: "Pan-seared chicken breast coated in a sticky-sweet honey garlic glaze with soy sauce and ginger, garnished with sesame seeds and green onions.", price: 33, calories: 390, protein: 34, carbs: 32, fats: 14, fiber: 1, sugar: 10, sodium: 560,
    ingredients: ["Chicken Breast", "Honey", "Soy Sauce", "Ginger", "Sesame", "Green Onion"],
},
  { id: "CHK-07", name: "Chicken Tikka", category: "chicken", description: "Boneless chicken chunks marinated in spiced yogurt and turmeric, cooked in a tandoor-style oven until charred and juicy, served with mint chutney.", price: 35, calories: 360, protein: 40, carbs: 12, fats: 18, fiber: 1, sugar: 3, sodium: 610,
    ingredients: ["Chicken Breast", "Yogurt", "Turmeric", "Garam Masala", "Lemon", "Mint"],
},
  { id: "CHK-08", name: "Lemon Pepper Chicken", category: "chicken", description: "Crispy pan-seared chicken breast generously seasoned with cracked black pepper, lemon zest, and fresh herbs, finished with a light lemon butter sauce.", price: 32, calories: 370, protein: 44, carbs: 8, fats: 19, fiber: 1, sugar: 1, sodium: 480,
    ingredients: ["Chicken Breast", "Lemon", "Black Pepper", "Butter", "Garlic", "Parsley"],
},
  { id: "CHK-09", name: "BBQ Chicken Thighs", category: "chicken", description: "Slow-cooked chicken thighs basted in a smoky-sweet barbecue sauce until fall-off-the-bone tender, served with coleslaw and cornbread.", price: 36, calories: 430, protein: 36, carbs: 22, fats: 22, fiber: 2, sugar: 12, sodium: 700,
    ingredients: ["Chicken Thighs", "BBQ Sauce", "Paprika", "Brown Sugar", "Garlic", "Coleslaw"],
},
  { id: "CHK-10", name: "Cajun Chicken", category: "chicken", description: "Blackened chicken breast seasoned with a bold Cajun spice blend of paprika, cayenne, thyme, and oregano, seared in a cast-iron skillet and served with dirty rice.", price: 33, calories: 400, protein: 42, carbs: 10, fats: 20, fiber: 2, sugar: 1, sodium: 650,
    ingredients: ["Chicken Breast", "Cajun Spice", "Paprika", "Cayenne", "Garlic", "Rice"],
},

  // Beef (5)
  { id: "BEF-01", name: "Beef Stir Fry", category: "beef", description: "Thinly sliced ribeye stir-fried with a medley of bell peppers, broccoli, snap peas, and carrots in a savory garlic-soy glaze.", price: 42, calories: 420, protein: 30, carbs: 25, fats: 22, fiber: 3, sugar: 5, sodium: 720,
    ingredients: ["Ribeye", "Soy Sauce", "Garlic", "Ginger", "Bell Peppers", "Broccoli"],
},
  { id: "BEF-02", name: "Beef Bourguignon", category: "beef", description: "Slow-braised beef chuck simmered for hours in red wine, beef broth, pearl onions, mushrooms, and aromatic vegetables for a deep, rich flavor.", price: 48, calories: 480, protein: 35, carbs: 20, fats: 28, fiber: 3, sugar: 4, sodium: 680,
    ingredients: ["Beef Chuck", "Red Wine", "Mushrooms", "Pearl Onions", "Carrots", "Thyme"],
},
  { id: "BEF-03", name: "Beef Kofta", category: "beef", description: "Ground beef blended with onions, parsley, cumin, coriander, and Middle Eastern spices, shaped onto skewers and grilled over charcoal.", price: 38, calories: 390, protein: 28, carbs: 18, fats: 24, fiber: 2, sugar: 2, sodium: 560,
    ingredients: ["Ground Beef", "Onion", "Parsley", "Cumin", "Coriander", "Garlic"],
},
  { id: "BEF-04", name: "Pepper Steak", category: "beef", description: "Tender strips of beef seared with colorful bell peppers and onions in a savory black pepper sauce served over steamed rice.", price: 44, calories: 440, protein: 34, carbs: 22, fats: 24, fiber: 2, sugar: 4, sodium: 640,
    ingredients: ["Beef Strips", "Black Pepper", "Bell Peppers", "Onion", "Soy Sauce", "Rice"],
},
  { id: "BEF-05", name: "Beef Tacos", category: "beef", description: "Seasoned ground beef with onions, tomatoes, and Mexican spices served in crispy corn shells with shredded lettuce, cheese, and salsa.", price: 36, calories: 410, protein: 26, carbs: 32, fats: 20, fiber: 4, sugar: 3, sodium: 620,
    ingredients: ["Ground Beef", "Corn Shells", "Lettuce", "Cheese", "Tomato", "Salsa"],
},

  // Seafood (8)
  { id: "SFD-01", name: "Grilled Salmon", category: "seafood", description: "Fresh Atlantic salmon fillet grilled to perfection, drizzled with a creamy lemon dill sauce, served with roasted asparagus and herbed rice.", price: 55, calories: 420, protein: 40, carbs: 8, fats: 26, fiber: 1, sugar: 1, sodium: 480,
    ingredients: ["Salmon Fillet", "Lemon", "Dill", "Butter", "Asparagus", "Rice"],
},
  { id: "SFD-02", name: "Garlic Butter Shrimp", category: "seafood", description: "Plump shrimp sautéed in a luscious garlic butter sauce with white wine, lemon juice, and fresh parsley, served with crusty bread.", price: 42, calories: 310, protein: 28, carbs: 6, fats: 20, fiber: 0, sugar: 1, sodium: 590,
    ingredients: ["Shrimp", "Butter", "Garlic", "White Wine", "Lemon", "Parsley"],
},
  { id: "SFD-03", name: "Fish & Chips", category: "seafood", description: "Beer-battered Atlantic cod fillets fried to a golden crisp, served with thick-cut fries, tartar sauce, and a wedge of lemon.", price: 38, calories: 520, protein: 22, carbs: 48, fats: 28, fiber: 3, sugar: 2, sodium: 740,
    ingredients: ["Cod", "Beer Batter", "Potatoes", "Flour", "Tartar Sauce", "Lemon"],
},
  { id: "SFD-04", name: "Chili Lime Fish", category: "seafood", description: "Flaky white fish fillets glazed with a zesty chili lime sauce, pan-seared until golden, served with mango salsa and coconut rice.", price: 40, calories: 340, protein: 36, carbs: 12, fats: 16, fiber: 1, sugar: 4, sodium: 420,
    ingredients: ["White Fish", "Chili", "Lime", "Mango", "Coconut", "Rice"],
},
  { id: "SFD-05", name: "Seafood Paella", category: "seafood", description: "A traditional Spanish paella loaded with shrimp, mussels, calamari, and chorizo, cooked with saffron-infused rice, bell peppers, and peas.", price: 48, calories: 450, protein: 24, carbs: 50, fats: 16, fiber: 3, sugar: 3, sodium: 680,
    ingredients: ["Shrimp", "Mussels", "Calamari", "Chorizo", "Saffron Rice", "Peas"],
},
  { id: "SFD-06", name: "Tuna Poke Bowl", category: "seafood", description: "Fresh ahi tuna marinated in soy sauce, sesame oil, and ginger, served over sushi rice with avocado, cucumber, seaweed, and spicy mayo.", price: 42, calories: 400, protein: 30, carbs: 40, fats: 12, fiber: 3, sugar: 4, sodium: 620,
    ingredients: ["Ahi Tuna", "Soy Sauce", "Sesame Oil", "Ginger", "Avocado", "Sushi Rice"],
},
  { id: "SFD-07", name: "Coconut Curry Fish", category: "seafood", description: "White fish fillets gently simmered in a fragrant coconut curry sauce with lemongrass, galangal, chili, and kaffir lime leaves.", price: 44, calories: 380, protein: 32, carbs: 18, fats: 22, fiber: 2, sugar: 3, sodium: 520,
    ingredients: ["White Fish", "Coconut Milk", "Lemongrass", "Curry Paste", "Kaffir Lime", "Chili"],
},
  { id: "SFD-08", name: "Lemon Butter Cod", category: "seafood", description: "Cod fillets pan-seared to a golden crust, finished in a silky lemon butter sauce with capers and fresh dill.", price: 45, calories: 320, protein: 34, carbs: 6, fats: 18, fiber: 0, sugar: 1, sodium: 460,
    ingredients: ["Cod", "Butter", "Lemon", "Capers", "Dill", "Garlic"],
},

  // Salads (5)
  { id: "SLD-01", name: "Caesar Salad", category: "salad", description: "Crisp romaine hearts tossed in house-made Caesar dressing with garlic, anchovy, and lemon, topped with shaved parmesan and crunchy croutons.", price: 28, calories: 350, protein: 18, carbs: 14, fats: 26, fiber: 3, sugar: 2, sodium: 640,
    ingredients: ["Romaine", "Parmesan", "Croutons", "Caesar Dressing", "Garlic", "Anchovy"],
},
  { id: "SLD-02", name: "Greek Salad", category: "salad", description: "Fresh tomatoes, cucumbers, red onions, Kalamata olives, and bell peppers tossed with oregano vinaigrette and topped with creamy feta cheese.", price: 26, calories: 280, protein: 8, carbs: 12, fats: 22, fiber: 4, sugar: 4, sodium: 580,
    ingredients: ["Tomato", "Cucumber", "Olives", "Feta", "Red Onion", "Oregano"],
},
  { id: "SLD-03", name: "Mediterranean Quinoa Salad", category: "salad", description: "Fluffy quinoa tossed with oven-roasted zucchini, cherry tomatoes, bell peppers, and red onion, drizzled with a creamy lemon-tahini dressing.", price: 30, calories: 340, protein: 12, carbs: 38, fats: 16, fiber: 6, sugar: 5, sodium: 420,
    ingredients: ["Quinoa", "Zucchini", "Tomato", "Tahini", "Lemon", "Bell Pepper"],
},
  { id: "SLD-04", name: "Asian Sesame Salad", category: "salad", description: "A vibrant mix of greens, shredded carrots, edamame, crispy wonton strips, and almonds, tossed in a tangy sesame ginger dressing.", price: 28, calories: 290, protein: 10, carbs: 18, fats: 20, fiber: 5, sugar: 6, sodium: 500,
    ingredients: ["Mixed Greens", "Carrots", "Edamame", "Wonton Strips", "Almonds", "Ginger Dressing"],
},
  { id: "SLD-05", name: "Cobb Salad", category: "salad", description: "Chopped romaine topped with hard-boiled egg, crispy bacon, diced avocado, blue cheese crumbles, cherry tomatoes, and red wine vinaigrette.", price: 32, calories: 420, protein: 24, carbs: 12, fats: 32, fiber: 4, sugar: 3, sodium: 720,
    ingredients: ["Romaine", "Egg", "Bacon", "Avocado", "Blue Cheese", "Tomato"],
},

  // Wraps (5)
  { id: "WRP-01", name: "Chicken Caesar Wrap", category: "wrap", description: "Grilled chicken breast, crisp romaine, shaved parmesan, and creamy Caesar dressing wrapped in a warm flour tortilla.", price: 30, calories: 420, protein: 28, carbs: 34, fats: 20, fiber: 2, sugar: 2, sodium: 640,
    ingredients: ["Chicken Breast", "Romaine", "Parmesan", "Caesar Dressing", "Tortilla", "Croutons"],
},
  { id: "WRP-02", name: "Falafel Wrap", category: "wrap", description: "House-made crispy chickpea falafel tucked into a tortilla with pickled turnips, fresh greens, tomatoes, and a drizzle of tahini sauce.", price: 28, calories: 380, protein: 14, carbs: 42, fats: 18, fiber: 8, sugar: 3, sodium: 520,
    ingredients: ["Chickpea Falafel", "Tahini", "Pickled Turnips", "Tomato", "Lettuce", "Tortilla"],
},
  { id: "WRP-03", name: "Beef Philly Wrap", category: "wrap", description: "Thinly shaved beef ribeye with sautéed bell peppers and onions, melted provolone cheese, and garlic aioli wrapped in a toasted tortilla.", price: 34, calories: 460, protein: 30, carbs: 32, fats: 24, fiber: 1, sugar: 3, sodium: 700,
    ingredients: ["Beef Ribeye", "Provolone", "Bell Peppers", "Onion", "Garlic Aioli", "Tortilla"],
},
  { id: "WRP-04", name: "Buffalo Chicken Wrap", category: "wrap", description: "Crispy buffalo chicken tenders tossed in house-made hot sauce, wrapped with lettuce, tomato, and cool ranch dressing.", price: 32, calories: 430, protein: 32, carbs: 30, fats: 20, fiber: 1, sugar: 2, sodium: 760,
    ingredients: ["Chicken Tenders", "Hot Sauce", "Ranch", "Lettuce", "Tomato", "Tortilla"],
},
  { id: "WRP-05", name: "Greek Veggie Wrap", category: "wrap", description: "Creamy hummus spread on a tortilla, loaded with roasted zucchini, bell peppers, red onion, crumbled feta, and fresh greens.", price: 28, calories: 340, protein: 10, carbs: 38, fats: 16, fiber: 6, sugar: 4, sodium: 480,
    ingredients: ["Hummus", "Zucchini", "Bell Pepper", "Red Onion", "Feta", "Tortilla"],
},

  // Breakfast (5)
  { id: "BRK-01", name: "Classic American Breakfast", category: "breakfast", description: "Two eggs any style with crispy bacon strips, golden hash browns, and buttered toast. A hearty start to the day.", price: 36, calories: 520, protein: 24, carbs: 40, fats: 30, fiber: 2, sugar: 4, sodium: 780,
    ingredients: ["Eggs", "Bacon", "Hash Browns", "Toast", "Butter", "Salt"],
},
  { id: "BRK-02", name: "Avocado Toast", category: "breakfast", description: "Creamy smashed avocado seasoned with lime and chili flakes on toasted sourdough, topped with two perfectly poached eggs.", price: 30, calories: 380, protein: 14, carbs: 30, fats: 24, fiber: 5, sugar: 2, sodium: 460,
    ingredients: ["Avocado", "Sourdough", "Eggs", "Lime", "Chili Flakes", "Salt"],
},
  { id: "BRK-03", name: "Pancake Stack", category: "breakfast", description: "A stack of three fluffy buttermilk pancakes served with warm maple syrup, fresh mixed berries, and a dusting of powdered sugar.", price: 28, calories: 450, protein: 10, carbs: 56, fats: 22, fiber: 2, sugar: 18, sodium: 520,
    ingredients: ["Flour", "Eggs", "Milk", "Butter", "Maple Syrup", "Berries"],
},
  { id: "BRK-04", name: "Eggs Benedict", category: "breakfast", description: "Two poached eggs and sliced ham on a toasted English muffin, smothered in velvety hollandaise sauce with a hint of lemon.", price: 34, calories: 480, protein: 26, carbs: 28, fats: 30, fiber: 1, sugar: 2, sodium: 740,
    ingredients: ["Eggs", "Ham", "English Muffin", "Hollandaise", "Butter", "Lemon"],
},
  { id: "BRK-05", name: "Greek Yogurt Parfait", category: "breakfast", description: "Thick Greek yogurt layered with honey, house-made granola, and a medley of fresh seasonal fruits — berries, mango, and kiwi.", price: 26, calories: 310, protein: 18, carbs: 38, fats: 10, fiber: 4, sugar: 16, sodium: 180,
    ingredients: ["Greek Yogurt", "Honey", "Granola", "Berries", "Mango", "Kiwi"],
},

  // Pasta (4)
  { id: "PST-01", name: "Spaghetti Bolognese", category: "pasta", description: "Al dente spaghetti tossed with a slow-simmered Bolognese sauce of ground beef, tomatoes, carrots, celery, and red wine.", price: 38, calories: 480, protein: 24, carbs: 55, fats: 18, fiber: 4, sugar: 6, sodium: 640,
    ingredients: ["Spaghetti", "Ground Beef", "Tomato", "Carrots", "Celery", "Red Wine"],
},
  { id: "PST-02", name: "Creamy Alfredo Pasta", category: "pasta", description: "Fresh fettuccine enveloped in a decadent parmesan cream sauce with garlic, butter, and a touch of nutmeg.", price: 40, calories: 520, protein: 18, carbs: 48, fats: 28, fiber: 2, sugar: 3, sodium: 580,
    ingredients: ["Fettuccine", "Cream", "Parmesan", "Butter", "Garlic", "Nutmeg"],
},
  { id: "PST-03", name: "Pesto Penne", category: "pasta", description: "Al dente penne tossed in house-made basil pesto with pine nuts, cherry tomatoes, and shaved parmesan.", price: 36, calories: 460, protein: 16, carbs: 46, fats: 24, fiber: 3, sugar: 3, sodium: 500,
    ingredients: ["Penne", "Basil", "Pine Nuts", "Parmesan", "Garlic", "Tomato"],
},
  { id: "PST-04", name: "Arrabiata Pasta", category: "pasta", description: "Penne in a fiery tomato sauce with garlic, red chili flakes, and fresh basil — simple, bold, and packed with flavor.", price: 34, calories: 420, protein: 14, carbs: 52, fats: 16, fiber: 5, sugar: 5, sodium: 560,
    ingredients: ["Penne", "Tomato", "Garlic", "Chili Flakes", "Basil", "Olive Oil"],
},

  // Soup (2)
  { id: "SUP-01", name: "Tomato Basil Soup", category: "soup", description: "Velvety tomato soup made with vine-ripened tomatoes, cream, and fresh basil, finished with a drizzle of extra virgin olive oil.", price: 24, calories: 220, protein: 6, carbs: 28, fats: 10, fiber: 3, sugar: 8, sodium: 480,
    ingredients: ["Tomato", "Cream", "Basil", "Garlic", "Onion", "Olive Oil"],
},
  { id: "SUP-02", name: "Chicken Noodle Soup", category: "soup", description: "A comforting chicken broth loaded with tender shredded chicken, sliced carrots, celery, egg noodles, and fresh herbs.", price: 26, calories: 250, protein: 14, carbs: 30, fats: 8, fiber: 2, sugar: 3, sodium: 620,
    ingredients: ["Chicken", "Egg Noodles", "Carrots", "Celery", "Garlic", "Herbs"],
  },
] as RawMenuItem[]).map((item) => ({
  ...item,
  ingredients: item.ingredients.map((name) => ({ name, quantity_g: 100, unit: null })),
}))

// Meal Times (Task 2)
export type MealTime = "breakfast" | "morning-snack" | "lunch" | "afternoon-snack" | "dinner"

export const MEAL_TIMES: { label: string; value: MealTime }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Morning Snack", value: "morning-snack" },
  { label: "Lunch", value: "lunch" },
  { label: "Afternoon Snack", value: "afternoon-snack" },
  { label: "Dinner", value: "dinner" },
]

// Goals / Plans (Task 3)
export type Goal = "weight-loss" | "balanced" | "high-protein" | "vegetarian" | "customized"

export const GOALS: { label: string; value: Goal }[] = [
  { label: "Weight Loss", value: "weight-loss" },
  { label: "Balanced", value: "balanced" },
  { label: "High Protein", value: "high-protein" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Customized", value: "customized" },
]

export const WEIGHT_LOSS_OPTIONS = [
  { label: "More Veg", value: "more-veg" },
  { label: "Less Rice", value: "less-rice" },
  { label: "Lean Protein", value: "lean-protein" },
]

export interface CustomizedGoalFields {
  calories: number
  fats: number
  carbs: number
}

// Preferred Carb (Task 4)
export type PreferredCarb =
  | "white-rice"
  | "brown-rice"
  | "mashed-potato"
  | "sweet-potato"
  | "beetroot-rice"
  | "mixed"

export const CARB_OPTIONS: { label: string; value: PreferredCarb }[] = [
  { label: "White Rice", value: "white-rice" },
  { label: "Brown Rice", value: "brown-rice" },
  { label: "Mashed Potato", value: "mashed-potato" },
  { label: "Sweet Potato", value: "sweet-potato" },
  { label: "Beetroot Rice", value: "beetroot-rice" },
  { label: "Mixed", value: "mixed" },
]

// Food Restrictions (Task 5)
export type FoodRestriction =
  | "no-onion"
  | "no-garlic"
  | "no-mushroom"
  | "no-seafood"
  | "no-beef"
  | "no-dairy"
  | "no-nuts"
  | "other"

export const FOOD_RESTRICTIONS: { label: string; value: FoodRestriction }[] = [
  { label: "No Onion", value: "no-onion" },
  { label: "No Garlic", value: "no-garlic" },
  { label: "No Mushroom", value: "no-mushroom" },
  { label: "No Seafood", value: "no-seafood" },
  { label: "No Beef", value: "no-beef" },
  { label: "No Dairy", value: "no-dairy" },
  { label: "No Nuts", value: "no-nuts" },
  { label: "Other", value: "other" },
]

// Meal Rotation (Task 6)
export type RotationMode = "chefs-choice" | "pre-select"

export const ROTATION_MODES: { label: string; value: RotationMode }[] = [
  { label: "Chef's Choice", value: "chefs-choice" },
  { label: "Pre-Select My Meals", value: "pre-select" },
]

// Meal Customization Logic (Task 9)
export const GOAL_MODIFICATIONS: Record<Goal, string> = {
  "weight-loss": "Same meal, Less rice",
  "balanced": "Normal portions",
  "high-protein": "Same meal, Extra chicken",
  "vegetarian": "Different meal",
  "customized": "Custom macro targets",
}

// Category counts for menu display validation
export const MENU_CATEGORY_COUNTS: Record<MenuCategory, { min: number; max: number }> = {
  chicken: { min: 4, max: 5 },
  beef: { min: 2, max: 3 },
  seafood: { min: 3, max: 4 },
  salad: { min: 3, max: 3 },
  wrap: { min: 3, max: 3 },
  breakfast: { min: 3, max: 4 },
  pasta: { min: 2, max: 2 },
  soup: { min: 1, max: 2 },
  pizza: { min: 2, max: 4 },
  burgers: { min: 2, max: 4 },
  drinks: { min: 3, max: 5 },
  biryani: { min: 2, max: 4 },
  risotto: { min: 2, max: 4 },
}

export function getMenuByCategory(category: MenuCategory): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.category === category)
}

export function getMenuItem(id: string): MenuItem | undefined {
  return MENU_ITEMS.find((item) => item.id === id)
}

export interface WeeklyMenu {
  weekOf: string
  items: Record<MenuCategory, MenuItem[]>
}

export const CURRENT_WEEKLY_MENU: WeeklyMenu = {
  weekOf: "Jul 21 – Jul 27",
  items: {
    chicken: [
      MENU_ITEMS.find((m) => m.id === "CHK-01")!,
      MENU_ITEMS.find((m) => m.id === "CHK-02")!,
      MENU_ITEMS.find((m) => m.id === "CHK-04")!,
      MENU_ITEMS.find((m) => m.id === "CHK-06")!,
      MENU_ITEMS.find((m) => m.id === "CHK-08")!,
    ],
    beef: [
      MENU_ITEMS.find((m) => m.id === "BEF-01")!,
      MENU_ITEMS.find((m) => m.id === "BEF-03")!,
      MENU_ITEMS.find((m) => m.id === "BEF-05")!,
    ],
    seafood: [
      MENU_ITEMS.find((m) => m.id === "SFD-01")!,
      MENU_ITEMS.find((m) => m.id === "SFD-02")!,
      MENU_ITEMS.find((m) => m.id === "SFD-04")!,
      MENU_ITEMS.find((m) => m.id === "SFD-07")!,
    ],
    salad: [
      MENU_ITEMS.find((m) => m.id === "SLD-01")!,
      MENU_ITEMS.find((m) => m.id === "SLD-02")!,
      MENU_ITEMS.find((m) => m.id === "SLD-04")!,
    ],
    wrap: [
      MENU_ITEMS.find((m) => m.id === "WRP-01")!,
      MENU_ITEMS.find((m) => m.id === "WRP-03")!,
      MENU_ITEMS.find((m) => m.id === "WRP-04")!,
    ],
    breakfast: [
      MENU_ITEMS.find((m) => m.id === "BRK-01")!,
      MENU_ITEMS.find((m) => m.id === "BRK-02")!,
      MENU_ITEMS.find((m) => m.id === "BRK-04")!,
      MENU_ITEMS.find((m) => m.id === "BRK-05")!,
    ],
    pasta: [
      MENU_ITEMS.find((m) => m.id === "PST-01")!,
      MENU_ITEMS.find((m) => m.id === "PST-03")!,
    ],
    soup: [
      MENU_ITEMS.find((m) => m.id === "SUP-01")!,
      MENU_ITEMS.find((m) => m.id === "SUP-02")!,
    ],
    pizza: [],
    burgers: [],
    drinks: [],
    biryani: [],
    risotto: [],
  },
}
