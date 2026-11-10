import { verifySubscriptionInviteToken } from "@/lib/subscription/invite-token"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const plan = searchParams.get("plan")

  if (!token) {
    return Response.json({ valid: false, error: "token is required" }, { status: 400 })
  }

  const result = verifySubscriptionInviteToken(token, plan)
  if (!result.valid) {
    return Response.json(result, { status: 400 })
  }

  return Response.json(result)
}
