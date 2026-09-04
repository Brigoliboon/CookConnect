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
  is_active: boolean;
  image_path: string | null;
}

export interface Ingredient {
  id: UUID;
  name: string;
  nutrition: any | null; // jsonb
  fatsecret_id: string;
}

export interface Serving {
  id: UUID;
  recipe_id: UUID; // -> public.recipes.id, the meal this serving belongs to
  name: string | null; // serving-type label (e.g. "Regular", "Large", "Family"); display name/desc/pictures inherit from the recipe
  price: number | null; // numeric
  calories: number | null; // numeric
  nutrition: any | null; // jsonb (per-serving macros)
  is_active: boolean; // default true
  created_at: string; // ISO timestamptz
  updated_at: string; // ISO timestamptz
}

export interface ServingIngredient {
  id: UUID;
  serving_id: UUID; // -> public.servings.id
  ingredient_id: UUID; // -> public.ingredients.id
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

export type OrderStatus =
  | "inquiry"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Order {
  id: UUID;
  customer_id: UUID | null; // -> public.accounts.id, null for guest checkout
  name: string;
  email: string;
  mobile_number: string;
  address: string | null;
  status: OrderStatus;
  subtotal_cents: number; // numeric
  shipping_cents: number; // numeric
  currency: string; // default "AED"
  location: any | null; // geography
  details: any; // jsonb // default {}
  created_at: string; // ISO timestamptz
  updated_at: string; // ISO timestamptz
}

export interface OrderItem {
  id: UUID;
  order_id: UUID; // -> public.orders.id
  recipe_id: UUID | null; // -> public.recipes.id
  name: string;
  unit_price_cents: number; // numeric
  qty: number; // int4
  note: string | null; // customer note for this item (e.g. "no onions", "extra spicy")
  image_path: string | null;
}

export interface PushSubscription {
  id: UUID;
  user_id: UUID; // -> public.accounts.id
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: UUID;
  recipient_user_id: UUID; // -> public.accounts.id
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}