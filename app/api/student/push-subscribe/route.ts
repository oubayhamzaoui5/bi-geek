import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

export async function POST(req: Request) {
  try {
    const { studentId, userId, subscription } = await req.json()
    const subscriberId = userId || studentId
    if (!subscriberId || !subscription?.endpoint) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 })
    }

    const pb = await getAdminPb()
    const { endpoint, keys } = subscription

    const existing = await pb.collection("push_subscriptions").getFullList({
      filter: `student = "${subscriberId}" && endpoint = "${String(endpoint).replace(/"/g, '\\"')}"`,
    }).catch(() => [])

    for (const rec of existing) {
      await pb.collection("push_subscriptions").delete(rec.id).catch(() => {})
    }

    await pb.collection("push_subscriptions").create({
      student: subscriberId,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("PUSH SUBSCRIBE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
