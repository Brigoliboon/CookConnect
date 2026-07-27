import axios from "axios"

const CLIENT_ID = process.env.FATSECRET_CLIENT_ID
const CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET

async function getBearerToken(): Promise<string> {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
  const res = await axios.post(
    "https://oauth.fatsecret.com/connect/token",
    new URLSearchParams({ grant_type: "client_credentials", scope: "basic" }),
    {
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  )
  return res.data.access_token
}

export async function GET(request: Request) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return Response.json({ error: "Missing FatSecret credentials" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const food_id = searchParams.get("food_id")

  if (!food_id) {
    return Response.json({ error: "food_id is required" }, { status: 400 })
  }

  try {
    const token = await getBearerToken()

    const res = await axios.get("https://platform.fatsecret.com/rest/food/v5", {
      params: { food_id, format: "json" },
      headers: { Authorization: `Bearer ${token}` },
    })

    return Response.json(res.data)
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return Response.json(
        { error: "FatSecret food lookup failed", details: err.response?.data ?? err.message },
        { status: err.response?.status ?? 500 },
      )
    }
    throw err
  }
}
