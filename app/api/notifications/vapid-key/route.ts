export async function GET() {
  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY
  if (!publicKey) return Response.json({ error: "Push not configured" }, { status: 500 })
  return Response.json({ publicKey })
}
