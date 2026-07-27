import axios from "axios"

const CLIENT_ID = process.env.FATSECRET_CLIENT_ID
const CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET

export async function GET() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return Response.json({ error: "Missing FatSecret credentials" }, { status: 500 })
  }

  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")

  try {
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

    return Response.json({
      access_token: res.data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + res.data.expires_in,
    })
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return Response.json(
        { error: "Failed to get FatSecret token", details: err.response?.data ?? err.message },
        { status: err.response?.status ?? 500 },
      )
    }
    throw err
  }
}
