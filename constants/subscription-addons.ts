export const SUBSCRIPTION_ADDON_PRICE_CENTS = 10000

export const SUBSCRIPTION_ADDON_KEYS = ["drinks", "cakes"] as const

export type SubscriptionAddonKey = (typeof SUBSCRIPTION_ADDON_KEYS)[number]

export interface SubscriptionAddonItem {
  label: string
  recipeId: string
  recipeName: string
}

export const SUBSCRIPTION_ADDON_ITEMS: Record<SubscriptionAddonKey, SubscriptionAddonItem[]> = {
  drinks: [
    { label: "Blueberry Banana Greek Yogurt", recipeId: "4ebde028-6dd8-491d-bea0-58ffc37f3742", recipeName: "Blueberry Banana Greek Yogurt" },
    { label: "Strawberry Banana Greek Yogurt", recipeId: "2e2063eb-b526-4c35-a6c7-e83c717db34d", recipeName: "Strawberry Banana Greek Yogurt" },
    { label: "Mixed Berries Walnut Protein Shake", recipeId: "10312e71-8363-4c1d-b44d-96614b584705", recipeName: "Mixed Berries Walnut Protein Shake" },
    { label: "Chocolate Protein Shake", recipeId: "37bb4c2b-21ef-47bc-ae1d-41a7dc35ae83", recipeName: "Chocolate Protein Shake" },
    { label: "Avocado & Banana Shake", recipeId: "8291dbcb-9651-4c5d-b0d9-8412895f7034", recipeName: "Avocado & Banana Shake" },
    { label: "Banana Milk & Walnut Juice", recipeId: "248209c5-4394-4fe6-97f2-c4887a39d376", recipeName: "Banana Milk & Walnut" },
    { label: "Carrot & Ginger Juice", recipeId: "f2fc12ab-f31c-4917-98b2-806f9717087d", recipeName: "Carrot & Ginger Juice" },
    { label: "Kiwi Juice", recipeId: "5fed69d5-2667-47f5-a542-9fd88ea483f0", recipeName: "Kiwi Juice" },
    { label: "Lime & Mint Juice", recipeId: "ac7f87a1-717e-4e1e-937b-40b0e0db7a4d", recipeName: "Lime & Mint Juice" },
    { label: "Green Apple Juice", recipeId: "afa7f3f5-756a-440d-bbc6-b93fde736a2f", recipeName: "Green Apple Juice" },
    { label: "Pineapple Juice", recipeId: "6d085276-1934-4933-a1b3-e0a61c6699b3", recipeName: "Pineapple Juice" },
    { label: "Carrot Juice", recipeId: "5ec0ee0b-8549-430c-9454-0abb2485e1d2", recipeName: "Carrot Juice" },
    { label: "Banana Strawberry Juice", recipeId: "f89a8fc4-ca37-4381-9126-a851920d6cb6", recipeName: "Banana Strawberry Juice" },
    { label: "Orange Juice", recipeId: "f84fe0f3-bcd9-4133-966d-c1861808333d", recipeName: "Orange Juice" },
    { label: "Strawberry and Lemon Juice", recipeId: "01a1dbeb-8844-4f47-9a41-ca4930622f46", recipeName: "Strawberry and Lemon Juice" },
  ],
  cakes: [
    { label: "Brownies Cake", recipeId: "6416c418-1978-4b79-86e9-e3376f75fd5a", recipeName: "Chocolate Brownies" },
    { label: "Carrot Cake", recipeId: "89abdf81-7220-4e7f-98d0-1f01524d7509", recipeName: "Carrot Cake" },
    { label: "Banana Mix with Nuts Cake", recipeId: "78438071-9ec0-49b5-9716-89b8ec109719", recipeName: "Banana Mix with Nuts Cake" },
    { label: "Mango Banana Walnut", recipeId: "1ed3be13-b0c5-4921-af89-f1b4e3666672", recipeName: "Mango Banana Walnut" },
  ],
}

export function subscriptionAddonTotalCents(details: Record<string, unknown>): number {
  return SUBSCRIPTION_ADDON_KEYS.reduce(
    (sum, key) => sum + (details[key] === true ? SUBSCRIPTION_ADDON_PRICE_CENTS : 0),
    0,
  )
}

export function subscriptionAddonRecipeIds(details: Record<string, unknown>): string[] {
  return SUBSCRIPTION_ADDON_KEYS.flatMap((key) => {
    const item = SUBSCRIPTION_ADDON_ITEMS[key][0]
    return details[key] === true && item ? [item.recipeId] : []
  })
}
