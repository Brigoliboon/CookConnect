export type UUID = string;

export type UserRole = "user" | "admin" | "employee" | "customer" | "rider";

export interface Account {
  id: UUID;
  name: string;
  email: string;
  mobile_number: Text;
  role: UserRole;
  is_active: boolean;
  created_at: string; // ISO timestamp
  location: any | null; // geography
}

export interface Recipe {
  id: UUID;
  name: string;
  category: string | null;
  description: string | null;
  price: number | null; // numeric -> number (may lose precision; string is safer if needed)
  calories: number | null; // numeric
  is_active: boolean;
  nutrition: any | null; // jsonb
  image_path: string | null;
}

export interface Ingredient {
  id: UUID;
  name: string;
  nutrition: any | null; // jsonb
  fatsecret_id: string;
}

export interface RecipeIngredient {
  id: UUID;
  recipe_id: UUID;
  ingredient_id: UUID;
  quantity_g: number; // numeric
  unit: string | null;
}
export type user_role = "user" | "admin" | "employee" | "customer" | "rider";

export type SubscriptionStatus = "active" | "cancelled";

export type SubscriptionPlan = {
  id: UUID;
  name: string;
  validity_days: number; // > 0
  price_cents: number; // >= 0
  currency: string; // default "USD"
  details: any | null; // jsonb // default {}
  is_active: boolean; // default true
  created_at: string; // ISO datetime from timestamptz
};

export type Subscription = {
  id: UUID;
  customer_id: UUID; // -> public.accounts.id
  subscription_plan_id: UUID; // -> public.subscription_plans.id
  status: SubscriptionStatus;
  started_at: string; // timestamptz (ISO)
  expires_at: string; // timestamptz (ISO)
  cancelled_at: string | null; // timestamptz, nullable
  details: any; //jsonb // default {}
  created_at: string; // ISO timestamptz
}

export interface SubscriptionIngredientQuota {
  id: UUID;
  subscription_id: UUID;
  ingredient_id: UUID;
  quota_total_g: number; // numeric
  quota_used_g: number; // numeric
  updated_at: string; // ISO timestamp
}

export type DeliverySlotStatus =
  | "scheduled"
  | "preparing"
  | "en_route"
  | "delivered"
  | "cancelled"
  | "locked";

export type MealWindow = "morning" | "evening";

export interface DeliverySlot {
  id: UUID;
  subscription_id: UUID;
  family_member_id: UUID;
  delivery_day: string; // date (YYYY-MM-DD)
  slot_label: "morning" | "evening";
  status: DeliverySlotStatus;
  locked_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface SubscriptionFamilyMember {
  id: UUID;
  subscription_id: UUID;
  member_index: number; // int4
  display_name: string | null;
  created_at: string; // ISO timestamp
}

export type MealInstanceStatus = "draft" | "locked" | "cancelled";

export interface MealInstance {
  id: UUID;
  delivery_slot_id: UUID;
  recipe_id: UUID;
  meal_window: MealWindow;
  status: MealInstanceStatus;
  locked_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  cutoff_at: string | null; // ISO timestamp
}

export interface MealInstanceIngredientConsumption {
  id: UUID;
  meal_instance_id: UUID;
  ingredient_id: UUID;
  quantity_g_used: number; // numeric
  created_at: string; // ISO timestamp
}

export type RiderAssignmentStatus = "assigned" | "started" | "delivered" | "cancelled";

export interface RiderAssignment {
  id: UUID;
  delivery_slot_id: UUID;
  rider_id: UUID;
  status: RiderAssignmentStatus;
  assigned_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}