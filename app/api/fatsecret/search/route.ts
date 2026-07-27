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
  const search_expression = searchParams.get("search_expression")
  const max_results = searchParams.get("max_results") ?? "3"

  if (!search_expression) {
    return Response.json({ error: "search_expression is required" }, { status: 400 })
  }

  try {
    const token = await getBearerToken()

    const res = await axios.get("https://platform.fatsecret.com/rest/foods/search/v1", {
      params: { search_expression, max_results, format: "json" },
      headers: { Authorization: `Bearer ${token}` },
    })

    return Response.json(res.data)
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return Response.json(
        { error: "FatSecret search failed", details: err.response?.data ?? err.message },
        { status: err.response?.status ?? 500 },
      )
    }
    throw err
  }
}
