import axios from "axios"

interface TokenData {
  access_token: string
  expires_at: number
}

const TOKEN_KEY = "fatsecret_token"

function getStoredToken(): TokenData | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TokenData
  } catch {
    return null
  }
}

function storeToken(token: TokenData) {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
}

function isExpired(token: TokenData): boolean {
  return Date.now() / 1000 >= token.expires_at - 60
}

async function fetchTokenFromApi(): Promise<TokenData> {
  const res = await axios.get("/api/fatsecret/token")
  return res.data
}

async function getValidToken(): Promise<string> {
  const stored = getStoredToken()
  if (stored && !isExpired(stored)) return stored.access_token

  const fresh = await fetchTokenFromApi()
  storeToken(fresh)
  return fresh.access_token
}

export class FatSecretClient {
  private api = axios.create({
    baseURL: "https://platform.fatsecret.com/rest/server.api",
  })

  async request<T>(method: "GET" | "POST", params: Record<string, string>): Promise<T> {
    const token = await getValidToken()

    const res = await this.api.request<T>({
      method,
      params: { format: "json", ...params },
      headers: { Authorization: `Bearer ${token}` },
    })

    return res.data
  }

  async searchFood(search_expression: string, max_results = 3) {
    const res = await axios.get<{ foods: { food: unknown[] } }>("/api/fatsecret/search", {
      params: { search_expression, max_results },
    })
    return res.data
  }

  async getFood(food_id: string) {
    return this.request<{ food: unknown }>("GET", {
      method: "food.get",
      food_id,
    })
  }

  async getFoodInfo(food_id: string) {
    const res = await axios.get<{ food: unknown }>("/api/fatsecret/food", {
      params: { food_id },
    })
    return res.data
  }

  async getRecipe(recipe_id: string) {
    return this.request<{ recipe: unknown }>("GET", {
      method: "recipe.get",
      recipe_id,
    })
  }
}
