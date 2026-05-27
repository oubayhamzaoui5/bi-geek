import { NextResponse } from "next/server"
import { authErrorResponse, getAdminPb, requireUser } from "@/lib/server-auth"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

function normalizeIds(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [String(value)] : []
}

function groupInstructorIds(group: any): string[] {
  const ids = normalizeIds(group?.instructor)
  return group?.programType === "bootcamp" ? ids : ids.slice(0, 1)
}

async function requireGroupEditor(req: Request, pb: any, groupId: string) {
  const user = await requireUser(req, ["instructor", "admin", "admin_agent"])
  const group = await pb.collection("groups").getOne(groupId)
  const ids = groupInstructorIds(group)
  if (user.role === "instructor" && !ids.includes(user.id)) {
    return { user, group: null as any, error: NextResponse.json({ error: "Permission refusee." }, { status: 403 }) }
  }
  return { user, group, error: null as NextResponse | null }
}

function ownerId(record: any, group: any) {
  return record?.instructor_id || groupInstructorIds(group)[0] || ""
}

function canEdit(user: { id: string; role: string }, group: any, record: any) {
  return user.role === "admin" || user.role === "admin_agent" || ownerId(record, group) === user.id
}

// POST: upload a file attachment to a lesson, video, or module
// FormData: { type: "lesson" | "video" | "module", parentId: string, name?: string, file: File }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()
    const { user, group, error } = await requireGroupEditor(req, pb, groupId)
    if (error) return error
    const formData = await req.formData()

    const type = formData.get("type") as string
    const parentId = formData.get("parentId") as string
    const name = (formData.get("name") as string) || ""
    const file = formData.get("file") as File | null
    const order = formData.get("order") as string | null

    if (!file || !parentId || !type) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    let collection: string
    let parentField: string
    if (type === "lesson") { collection = "lesson_attachments"; parentField = "lesson_id" }
    else if (type === "module") { collection = "module_attachments"; parentField = "module_id" }
    else { collection = "video_attachments"; parentField = "video_id" }

    const pbForm = new FormData()
    pbForm.append(parentField, parentId)
    pbForm.append("instructor_id", user.id)
    pbForm.append("name", name || file.name)
    pbForm.append("file", file)
    if (type === "module") pbForm.append("group_id", groupId)
    if (type === "module" && order !== null) {
      const rank = Math.max(0, groupInstructorIds(group).indexOf(user.id))
      pbForm.append("order", String(Number(order) + 100000 * rank))
    }

    const record = await pb.collection(collection).create(pbForm)

    return NextResponse.json({
      ok: true,
      attachment: {
        id: record.id,
        name: record.name || file.name,
        url: `${PB_FILE_URL}/api/files/${collection}/${record.id}/${record.file}`,
        ...(type === "lesson" ? { lessonId: record.lesson_id }
          : type === "module" ? { moduleId: record.module_id, order: record.order ?? 0 }
          : { videoId: record.video_id }),
        instructorId: record.instructor_id || user.id,
        canEdit: true,
      },
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("ATTACHMENT POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: remove an attachment
// body: { type: "lesson_attachment" | "video_attachment", id: string }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()
    const { user, group, error } = await requireGroupEditor(req, pb, groupId)
    if (error) return error
    const { type, id } = await req.json()
    const collection = type === "lesson_attachment" ? "lesson_attachments" : type === "module_attachment" ? "module_attachments" : "video_attachments"
    const record = await pb.collection(collection).getOne(id)
    if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
    await pb.collection(collection).delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("ATTACHMENT DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
