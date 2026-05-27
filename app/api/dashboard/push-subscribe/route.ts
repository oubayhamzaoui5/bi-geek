import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!,
  )
  return pb
}

export async function DELETE(req: Request) {
  try {
    const { endpoint } = await req.json().catch(() => ({}))
    const userId = req.headers.get("x-bi-geek-user-id")

    if (!userId && !endpoint) {
      return NextResponse.json({ error: "Donnees manquantes." }, { status: 400 })
    }

    const pb = await getAdminPb()

    const parts: string[] = []
    if (userId) parts.push(`student = "${userId}"`)
    if (endpoint) parts.push(`endpoint = "${String(endpoint).replace(/"/g, '\\"')}"`)
    const filter = parts.join(" && ")

    const records = await pb.collection("push_subscriptions").getFullList({ filter }).catch(() => [])
    for (const rec of records) {
      await pb.collection("push_subscriptions").delete(rec.id).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("DASHBOARD PUSH UNSUBSCRIBE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { subscription } = await req.json()
    const userId = req.headers.get("x-bi-geek-user-id")

    if (!userId || !subscription?.endpoint) {
      return NextResponse.json({ error: "Donnees manquantes." }, { status: 400 })
    }

    const pb = await getAdminPb()
    const { endpoint, keys } = subscription

    const existing = await pb.collection("push_subscriptions").getFullList({
      filter: `student = "${userId}" && endpoint = "${String(endpoint).replace(/"/g, '\\"')}"`,
    }).catch(() => [])

    for (const rec of existing) {
      await pb.collection("push_subscriptions").delete(rec.id).catch(() => {})
    }

    await pb.collection("push_subscriptions").create({
      student: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("DASHBOARD PUSH SUBSCRIBE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
