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
      return NextResponse.json({
        ...(await readDefaultCourseResources(pb, group.course)),
        groupId,
        resourceMode: "default",
        sourceCourseId: group.course,
      })
    }

    const lessons = await safeGetList(pb, "group_lessons", `group_id = "${groupId}"`, "order")

    let videos: any[] = []
    let lessonAttachments: any[] = []
    let videoAttachments: any[] = []
    let moduleVideos: any[] = []
    let moduleAttachments: any[] = []

    if (lessons.length > 0) {
      const lessonFilter = lessons.map((l: any) => `lesson_id = "${l.id}"`).join(" || ")
      videos = await safeGetList(pb, "lesson_videos", lessonFilter, "order")
      lessonAttachments = await safeGetList(pb, "lesson_attachments", lessonFilter, "created")
    }

    if (videos.length > 0) {
      const videoFilter = videos.map((v: any) => `video_id = "${v.id}"`).join(" || ")
      videoAttachments = await safeGetList(pb, "video_attachments", videoFilter, "created")
    }

    if (modules.length > 0) {
      const modFilter = modules.map((m: any) => `module_id = "${m.id}"`).join(" || ")
      moduleVideos = await safeGetList(pb, "module_videos", modFilter, "order")
      moduleAttachments = await safeGetList(pb, "module_attachments", modFilter, "order")
    }

    return NextResponse.json({
      ok: true,
      resourceMode: "custom",
      modules: modules.map((m: any) => ({ id: m.id, title: m.title || "", order: m.order ?? 0, description: m.description || "" })),
      lessons: lessons.map((l: any) => ({
        id: l.id,
        slug: l.slug || l.id,
        moduleId: l.module_id || "",
        title: l.title || "",
        order: l.order ?? 0,
        description: l.description || "",
        content: l.content || "",
      })),
      videos: videos.map((v: any) => ({
        id: v.id,
        lessonId: v.lesson_id || "",
        title: v.title || "",
        order: v.order ?? 0,
        driveUrl: v.drive_url || "",
        description: v.description || "",
      })),
      lessonAttachments: lessonAttachments.map((a: any) => ({
        id: a.id,
        lessonId: a.lesson_id || "",
        name: a.name || a.file || "",
        url: a.file ? attachmentUrl("lesson_attachments", a.id, a.file) : null,
      })),
      videoAttachments: videoAttachments.map((a: any) => ({
        id: a.id,
        videoId: a.video_id || "",
        name: a.name || a.file || "",
        url: a.file ? attachmentUrl("video_attachments", a.id, a.file) : null,
      })),
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
