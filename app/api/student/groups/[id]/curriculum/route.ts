import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { authErrorResponse, requireUser } from "@/lib/server-auth"
import { readDefaultCourseResources, resolveGroupResourceMode } from "@/lib/server-course-resources"

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

async function safeGetList(pb: any, collection: string, filter: string, sort?: string) {
  try {
    return await pb.collection(collection).getFullList({
      filter,
      ...(sort ? { sort } : {}),
    })
  } catch {
    if (!sort) return []
    try {
      return await pb.collection(collection).getFullList({ filter })
    } catch {
      return []
    }
  }
}

function attachmentUrl(collection: string, recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${collection}/${recordId}/${filename}`
}

async function assertCanReadGroup(req: Request, pb: any, groupId: string) {
  const user = await requireUser(req, ["student", "admin", "admin_agent"])
  const group = await pb.collection("groups").getOne(groupId)
  const studentIds = Array.isArray(group.students) ? group.students : []
  if (user.role !== "admin" && user.role !== "admin_agent" && !studentIds.includes(user.id)) {
    return false
  }
  return group
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()
    const group = await assertCanReadGroup(req, pb, groupId)
    if (!group) {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 })
    }

    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    const resourceMode = resolveGroupResourceMode(group, modules)
    if (resourceMode === "default" && group.course) {
      const source = await readDefaultCourseResources(pb, group.course)
      return NextResponse.json({
        ok: true,
        modules: source.modules,
        moduleVideos: source.moduleVideos || [],
        moduleAttachments: source.moduleAttachments || [],
        groupId,
        resourceMode: "default",
        sourceCourseId: group.course,
      })
    }

    let moduleVideos: any[] = []
    let moduleAttachments: any[] = []

    if (modules.length > 0) {
      const modFilter = modules.map((m: any) => `module_id = "${m.id}"`).join(" || ")
      moduleVideos = await safeGetList(pb, "module_videos", modFilter, "order")
      moduleAttachments = await safeGetList(pb, "module_attachments", modFilter, "order")
    }

    return NextResponse.json({
      ok: true,
      resourceMode: "custom",
      modules: modules.map((m: any) => ({ id: m.id, title: m.title || "", order: m.order ?? 0, description: m.description || "" })),
      moduleVideos: moduleVideos.map((v: any) => ({
        id: v.id,
        moduleId: v.module_id || "",
        title: v.title || "",
        order: v.order ?? 0,
        driveUrl: v.drive_url || "",
        description: v.description || "",
      })),
      moduleAttachments: moduleAttachments.map((a: any) => ({
        id: a.id,
        moduleId: a.module_id || "",
        name: a.name || a.file || "",
        url: a.file ? attachmentUrl("module_attachments", a.id, a.file) : null,
        order: a.order ?? 999,
      })),
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("STUDENT CURRICULUM GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
