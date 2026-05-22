import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { authErrorResponse, requireUser } from "@/lib/server-auth"
import { readDefaultCourseLesson, resolveGroupResourceMode } from "@/lib/server-course-resources"

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

async function getLessonBySlugOrId(pb: any, groupId: string, slugOrId: string) {
  try {
    return await pb.collection("group_lessons").getFirstListItem(`group_id = "${groupId}" && slug = "${slugOrId}"`)
  } catch {
    const lesson = await pb.collection("group_lessons").getOne(slugOrId)
    if (lesson.group_id !== groupId) throw new Error("Lecon introuvable")
    return lesson
  }
}

async function assertCanReadGroup(req: Request, pb: any, groupId: string) {
  const user = await requireUser(req, ["student", "admin", "admin_agent"])
  const group = await pb.collection("groups").getOne(groupId, { expand: "instructor" })
  const studentIds = Array.isArray(group.students) ? group.students : []
  if (user.role !== "admin" && user.role !== "admin_agent" && !studentIds.includes(user.id)) {
    return null
  }
  return group
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; lessonSlug: string }> },
) {
  try {
    const { id: groupId, lessonSlug } = await params
    const pb = await getAdminPb()
    const group = await assertCanReadGroup(req, pb, groupId)
    if (!group) return NextResponse.json({ error: "Lecon introuvable" }, { status: 404 })

    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    if (resolveGroupResourceMode(group, modules) === "default" && group.course) {
      const defaults = await readDefaultCourseLesson(pb, group.course, lessonSlug)
      return NextResponse.json({
        ok: true,
        resourceMode: "default",
        lesson: defaults.lesson,
        module: defaults.module ? { id: defaults.module.id, title: defaults.module.title || "", order: defaults.module.order ?? 0 } : null,
        moduleIndex: defaults.moduleIndex,
        lessonIndex: defaults.lessonIndex,
        groupId,
        groupTitle: group.title || "",
        instructor: group.expand?.instructor
          ? { name: group.expand.instructor.name || "", surname: group.expand.instructor.surname || "" }
          : null,
        allModules: defaults.resources.modules.map((m: any) => ({ id: m.id, title: m.title || "", order: m.order ?? 0 })),
        allLessons: defaults.resources.lessons.map((l: any) => ({ id: l.id, title: l.title || "", order: l.order ?? 0, moduleId: l.moduleId || "" })),
        moduleLessons: defaults.moduleLessons.map((l: any) => ({ id: l.id, title: l.title || "", order: l.order ?? 0 })),
        videos: defaults.videos,
        lessonAttachments: defaults.lessonAttachments,
        videoAttachments: [],
      })
    }

    const lesson = await getLessonBySlugOrId(pb, groupId, lessonSlug)
    const moduleLessons = await safeGetList(pb, "group_lessons", `group_id = "${groupId}"`, "order")

    const sortedMods = [...modules].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    const module = sortedMods.find((m: any) => m.id === lesson.module_id)
    const moduleIndex = module ? sortedMods.indexOf(module) + 1 : 1
    const modLessons = moduleLessons
      .filter((l: any) => l.module_id === lesson.module_id)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    const lessonIndex = modLessons.findIndex((l: any) => l.id === lesson.id) + 1

    const videos = await safeGetList(pb, "lesson_videos", `lesson_id = "${lesson.id}"`, "created")
    const lessonAttachments = await safeGetList(pb, "lesson_attachments", `lesson_id = "${lesson.id}"`, "created")
    let videoAttachments: any[] = []
    if (videos.length > 0) {
      const vFilter = videos.map((v: any) => `video_id = "${v.id}"`).join(" || ")
      videoAttachments = await safeGetList(pb, "video_attachments", vFilter, "created")
    }

    return NextResponse.json({
      ok: true,
      resourceMode: "custom",
      lesson: {
        id: lesson.id,
        slug: lesson.slug || lesson.id,
        title: lesson.title || "",
        description: lesson.description || "",
        content: lesson.content || "",
        order: lesson.order ?? 0,
        moduleId: lesson.module_id || "",
      },
      module: module ? { id: module.id, title: module.title || "", order: module.order ?? 0 } : null,
      moduleIndex,
      lessonIndex,
      groupId,
      groupTitle: group.title || "",
      instructor: group.expand?.instructor
        ? { name: group.expand.instructor.name || "", surname: group.expand.instructor.surname || "" }
        : null,
      allModules: sortedMods.map((m: any) => ({ id: m.id, title: m.title || "", order: m.order ?? 0 })),
      allLessons: moduleLessons
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((l: any) => ({ id: l.id, title: l.title || "", order: l.order ?? 0, moduleId: l.module_id || "" })),
      moduleLessons: modLessons.map((l: any) => ({ id: l.id, title: l.title || "", order: l.order ?? 0 })),
      videos: videos.map((v: any) => ({
        id: v.id,
        lessonId: v.lesson_id,
        title: v.title || "",
        driveUrl: v.drive_url || "",
        description: v.description || "",
      })),
      lessonAttachments: lessonAttachments.map((a: any) => ({
        id: a.id,
        lessonId: a.lesson_id,
        name: a.name || a.file || "",
        url: a.file ? `${PB_FILE_URL}/api/files/lesson_attachments/${a.id}/${a.file}` : null,
      })),
      videoAttachments: videoAttachments.map((a: any) => ({
        id: a.id,
        videoId: a.video_id,
        name: a.name || a.file || "",
        url: a.file ? `${PB_FILE_URL}/api/files/video_attachments/${a.id}/${a.file}` : null,
      })),
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("STUDENT LESSON GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
