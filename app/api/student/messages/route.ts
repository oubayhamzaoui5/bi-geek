import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { assertSelfOrRole, authErrorResponse, requireUser } from "@/lib/server-auth"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

function fileUrl(record: any, filename: string) {
  return `${process.env.POCKETBASE_URL}/api/files/${record.collectionId}/${record.id}/${filename}`
}

function formatMessage(m: any) {
  const files = Array.isArray(m.attachments) ? m.attachments : m.attachments ? [m.attachments] : []
  const created = m.sent_at || m.created || m.updated || ""
  return {
    id: m.id,
    group: m.group || "",
    sender: m.sender,
    recipient: m.recipient || "",
    content: m.content || "",
    created,
    sent_at: created,
    read: m.read || false,
    attachments: files.map((name: string) => ({
      name,
      url: fileUrl(m, name),
      isImage: /\.(png|jpe?g|webp|gif)$/i.test(name),
    })),
  }
}

function sortByCreated(records: any[]) {
  return records.sort((a, b) => new Date(a.sent_at || a.created || a.updated || 0).getTime() - new Date(b.sent_at || b.created || b.updated || 0).getTime())
}

async function assertStudentInGroup(pb: PocketBase, studentId: string, groupId: string) {
  const group = await pb.collection("groups").getOne(groupId)
  const students = Array.isArray(group.students) ? group.students : []
  if (!students.includes(studentId)) throw new Error("GROUP_ACCESS_DENIED")
  return group
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const groupId = searchParams.get("groupId")
    const markRead = searchParams.get("markRead") !== "0"

    if (!studentId || !groupId) {
      return NextResponse.json({ error: "studentId et groupId requis" }, { status: 400 })
    }
    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    assertSelfOrRole(user, studentId)

    const pb = await getAdminPb()
    await assertStudentInGroup(pb, studentId, groupId)

    const records = await pb.collection("messages").getFullList({
      filter: `group = "${groupId}"`,
    }).catch(() => [])

    const messages = sortByCreated(records).map(formatMessage)

    const unreadIds = records
      .filter((m: any) => m.sender !== studentId && !m.read)
      .map((m: any) => m.id)

    if (markRead && unreadIds.length > 0) {
      Promise.allSettled(unreadIds.map((id: string) => pb.collection("messages").update(id, { read: true })))
    }

    return NextResponse.json({ ok: true, messages })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    if (err?.message === "GROUP_ACCESS_DENIED") {
      return NextResponse.json({ error: "Permission refusee." }, { status: 403 })
    }
    console.error("STUDENT MESSAGES GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    const pb = await getAdminPb()

    const contentType = req.headers.get("content-type") || ""
    let sender = ""
    let groupId = ""
    let recipient = ""
    let content = ""
    let body: FormData | Record<string, any>

    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData()
      sender = String(fd.get("sender") || "")
      groupId = String(fd.get("groupId") || "")
      recipient = String(fd.get("recipient") || "")
      content = String(fd.get("content") || "")
      body = fd
    } else {
      const json = await req.json()
      sender = json.sender || ""
      groupId = json.groupId || ""
      recipient = json.recipient || ""
      content = json.content || ""
      body = { group: groupId, sender, recipient, content: content.trim(), read: false, sent_at: new Date().toISOString() }
    }

    if (!sender || !groupId || !content.trim() && !(body instanceof FormData && body.getAll("attachments").length > 0)) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 })
    }

    assertSelfOrRole(user, sender)
    const group = await assertStudentInGroup(pb, sender, groupId)

    if (body instanceof FormData) {
      body.set("group", groupId)
      body.set("sender", sender)
      body.set("recipient", recipient || group.instructor || "")
      body.set("content", content.trim())
      body.set("read", "false")
      body.set("sent_at", new Date().toISOString())
      body.delete("groupId")
    }

    const record = await pb.collection("messages").create(body)
    return NextResponse.json({ ok: true, message: formatMessage(record) })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    if (err?.message === "GROUP_ACCESS_DENIED") {
      return NextResponse.json({ error: "Permission refusee." }, { status: 403 })
    }
    console.error("STUDENT MESSAGES POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
