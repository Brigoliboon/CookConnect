function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function enablePush(): Promise<boolean> {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return false
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return false
  const reg = await navigator.serviceWorker.register("/sw.js")
  const { publicKey } = await fetch("/api/notifications/vapid-key").then((r) => r.json())
  if (!publicKey) return false
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
  const res = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...sub.toJSON(), userAgent: navigator.userAgent }),
  })
  return res.ok
}

export async function disablePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false
  const reg = await navigator.serviceWorker.getRegistration("/sw.js")
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return true
  await fetch("/api/notifications/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })
  await sub.unsubscribe()
  return true
}
