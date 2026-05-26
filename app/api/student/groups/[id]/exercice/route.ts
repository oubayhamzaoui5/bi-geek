import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { authErrorResponse, requireUser } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!,
  )
  return pb
}

async function assertCanReadGroup(req: Request, pb: any, groupId: string) {
  const user = await requireUser(req, ["student", "admin", "admin_agent"])
  const group = await pb.collection("groups").getOne(groupId)
  const studentIds = Array.isArray(group.students) ? group.students : []
  if (user.role !== "admin" && user.role !== "admin_agent" && !studentIds.includes(user.id)) return false
  return true
}

function fileUrl(collection: string, recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${collection}/${recordId}/${filename}`
}

async function safeList(pb: any, col: string, filter: string, sort = "created") {
  try {
    return await pb.collection(col).getFullList({ filter, sort })
  } catch {
    try {
      return await pb.collection(col).getFullList({ filter })
    } catch {
      return []
    }
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()
    const canRead = await assertCanReadGroup(req, pb, groupId)
    if (!canRead) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 })

    const url = new URL(req.url)
    const exerciceId = url.searchParams.get("exerciceId")

    if (exerciceId) {
      const ex = await pb.collection("exercises").getOne(exerciceId)
      if (ex.group_id !== groupId) return NextResponse.json({ error: "Exercice introuvable" }, { status: 404 })
      const atts = await safeList(pb, "exercise_attachments", `exercise_id = "${exerciceId}"`)
      return NextResponse.json({
        ok: true,
        exercise: {
          id: ex.id,
          moduleId: ex.module_id || "",
          title: ex.title || "",
          description: ex.description || "",
          deadline: ex.deadline || null,
          attachments: atts.map((a: any) => ({
            id: a.id,
            name: a.name || a.file || "",
            url: a.file ? fileUrl("exercise_attachments", a.id, a.file) : null,
          })),
        },
      })
    }

    const exercises = await safeList(pb, "exercises", `group_id = "${groupId}"`)
    const result = await Promise.all(exercises.map(async (ex: any) => {
      const attachments = await safeList(pb, "exercise_attachments", `exercise_id = "${ex.id}"`)
      return {
        id: ex.id,
        moduleId: ex.module_id || "",
        title: ex.title || "",
        description: ex.description || "",
        deadline: ex.deadline || null,
        attachmentsCount: attachments.length,
      }
    }))

    return NextResponse.json({ ok: true, exercises: result })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
