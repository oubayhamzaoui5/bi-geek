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

// GET — fetch conversation between instructor and a student
// ?instructorId=xxx&studentId=yyy  → returns messages between them
// ?instructorId=xxx                → returns latest message per student (inbox)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const instructorId = searchParams.get("instructorId")
    const studentId = searchParams.get("studentId")

    if (!instructorId) return NextResponse.json({ error: "instructorId requis" }, { status: 400 })

    const pb = await getAdminPb()

    if (studentId) {
      // Fetch conversation
      const records = await pb.collection("messages").getFullList({
        filter: `(sender = "${instructorId}" && recipient = "${studentId}") || (sender = "${studentId}" && recipient = "${instructorId}")`,
        sort: "created",
      }).catch(() => [])

      const messages = records.map((m: any) => ({
        id: m.id,
        sender: m.sender,
        recipient: m.recipient,
        content: m.content,
        created: m.created,
        read: m.read || false,
      }))

      return NextResponse.json({ ok: true, messages })
    } else {
      // Inbox: fetch all messages involving instructor, group by other party
      const records = await pb.collection("messages").getFullList({
        filter: `sender = "${instructorId}" || recipient = "${instructorId}"`,
        sort: "-created",
      }).catch(() => [])

      // Group by conversation partner, keep latest message
      const convMap: Record<string, any> = {}
      for (const m of records) {
        const partner = m.sender === instructorId ? m.recipient : m.sender
        if (!convMap[partner]) {
          convMap[partner] = {
            partnerId: partner,
            lastMessage: m.content,
            lastMessageDate: m.created,
            unread: m.recipient === instructorId && !m.read ? 1 : 0,
          }
        } else if (m.recipient === instructorId && !m.read) {
          convMap[partner].unread = (convMap[partner].unread || 0) + 1
        }
      }

      return NextResponse.json({ ok: true, conversations: Object.values(convMap) })
    }
  } catch (err: any) {
    console.error("INSTRUCTOR MESSAGES GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// POST — send a message
export async function POST(req: Request) {
  try {
    const pb = await getAdminPb()
    const { sender, recipient, content } = await req.json()

    if (!sender || !recipient || !content?.trim()) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    const record = await pb.collection("messages").create({
      sender,
      recipient,
      content: content.trim(),
      read: false,
    })

    return NextResponse.json({
      ok: true,
      message: {
        id: record.id,
        sender: record.sender,
        recipient: record.recipient,
        content: record.content,
        created: record.created,
        read: record.read || false,
      },
    })
  } catch (err: any) {
    console.error("INSTRUCTOR MESSAGES POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// PATCH — mark messages as read
export async function PATCH(req: Request) {
  try {
    const pb = await getAdminPb()
    const { messageIds } = await req.json()

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ ok: true })
    }

    await Promise.allSettled(
      messageIds.map(id => pb.collection("messages").update(id, { read: true }))
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("INSTRUCTOR MESSAGES PATCH ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
