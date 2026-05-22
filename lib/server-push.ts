import PocketBase from "pocketbase"
import webpush from "web-push"

type PushPayload = {
  title: string
  body: string
  url: string
  tag?: string
  icon?: string
  requireInteraction?: boolean
  actions?: Array<{ action: string; title: string }>
}

let vapidConfigured = false

function configureVapid() {
  if (vapidConfigured) return true
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

export async function sendPushToUsers(pb: PocketBase, userIds: string[], payload: PushPayload) {
  if (userIds.length === 0 || !configureVapid()) return 0

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueUserIds.length === 0) return 0

  const filter = uniqueUserIds.map((id) => `student = "${id}"`).join(" || ")
  const subscriptions = await pb.collection("push_subscriptions").getFullList({ filter }).catch(() => [])

  let sent = 0
  for (const sub of subscriptions as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload)
      )
      sent++
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await pb.collection("push_subscriptions").delete(sub.id).catch(() => {})
      }
    }
  }

  return sent
}

export async function sendPushToAdmins(pb: PocketBase, payload: PushPayload) {
  const admins = await pb.collection("users").getFullList({
    filter: `role = "admin" || role = "admin_agent"`,
    fields: "id",
  }).catch(() => [])

  return sendPushToUsers(pb, (admins as any[]).map((admin) => admin.id), payload)
}
