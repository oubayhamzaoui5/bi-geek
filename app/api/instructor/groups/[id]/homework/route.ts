import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

export const dynamic = "force-dynamic"

/*
  PocketBase collections required:
  ─ homework              fields: module_id(text,required), group_id(text,required), title(text,required), text(text), deadline(text)
  ─ homework_attachments  fields: homework_id(text,required), name(text), file(file)
  ─ homework_submissions  fields: homework_id(text,required), student_id(text,required), submitted_at(text)
  ─ homework_submission_files fields: submission_id(text,required), name(text), file(file)
*/

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

function fileUrl(collection: string, recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${collection}/${recordId}/${filename}`
}

async function safeList(pb: any, col: string, filter: string, sort = "created") {
  try { return await pb.collection(col).getFullList({ filter, sort }) } catch { return [] }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()

    // Use direct query so errors propagate instead of silently returning []
    let hwList: any[] = []
    try {
      hwList = await pb.collection("homework").getFullList({ filter: `group_id = "${groupId}"`, sort: "created" })
    } catch {
      // Fallback: fetch all and filter in JS (handles missing group_id field edge case)
      try {
        const all = await pb.collection("homework").getFullList({ sort: "created" })
        hwList = all.filter((h: any) => h.group_id === groupId)
      } catch { hwList = [] }
    }

    let attachments: any[] = []
    if (hwList.length > 0) {
      const filter = hwList.map((h: any) => `homework_id = "${h.id}"`).join(" || ")
      attachments = await safeList(pb, "homework_attachments", filter)
    }

    const submissionCounts: Record<string, number> = {}
    for (const hw of hwList) {
      const subs = await safeList(pb, "homework_submissions", `homework_id = "${hw.id}"`)
      submissionCounts[hw.id] = subs.length
    }

    return NextResponse.json({
      ok: true,
      homework: hwList.map((h: any) => ({
        id: h.id,
        moduleId: h.module_id || "",
        groupId: h.group_id || "",
        title: h.title || "",
        text: h.text || "",
        deadline: h.deadline || null,
        attachments: attachments
          .filter((a: any) => a.homework_id === h.id)
          .map((a: any) => ({
            id: a.id,
            name: a.name || a.file || "",
            url: a.file ? fileUrl("homework_attachments", a.id, a.file) : null,
          })),
        submissionsCount: submissionCounts[h.id] || 0,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()
    const { moduleId, title, text, deadline } = await req.json()

    const record = await pb.collection("homework").create({
      module_id: moduleId,
      group_id: groupId,
      title: title || "Nouveau devoir",
      text: text || "",
      deadline: deadline || null,
    })

    return NextResponse.json({
      ok: true,
      homework: {
        id: record.id,
        moduleId: record.module_id || "",
        groupId: record.group_id || "",
        title: record.title || "",
        text: record.text || "",
        deadline: record.deadline || null,
        attachments: [],
        submissionsCount: 0,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const pb = await getAdminPb()
    const { id, title, text, deadline } = await req.json()

    const record = await pb.collection("homework").update(id, {
      title,
      text,
      deadline: deadline || null,
    })

    return NextResponse.json({
      ok: true,
      homework: {
        id: record.id,
        moduleId: record.module_id || "",
        groupId: record.group_id || "",
        title: record.title || "",
        text: record.text || "",
        deadline: record.deadline || null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const pb = await getAdminPb()
    const { id } = await req.json()

    const atts = await safeList(pb, "homework_attachments", `homework_id = "${id}"`)
    for (const a of atts) try { await pb.collection("homework_attachments").delete(a.id) } catch {}

    const subs = await safeList(pb, "homework_submissions", `homework_id = "${id}"`)
    for (const s of subs) {
      const files = await safeList(pb, "homework_submission_files", `submission_id = "${s.id}"`)
      for (const f of files) try { await pb.collection("homework_submission_files").delete(f.id) } catch {}
      try { await pb.collection("homework_submissions").delete(s.id) } catch {}
    }

    await pb.collection("homework").delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
