import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { readDefaultCourseLesson, resolveGroupResourceMode } from "@/lib/server-course-resources"

export const dynamic = "force-dynamic"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
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
    if (sort) {
      try {
        return await pb.collection(collection).getFullList({ filter })
      } catch {
        return []
      }
    }
    return []
  }
}

async function getLessonBySlugOrId(pb: any, slugOrId: string) {
  // Try by slug first, fall back to ID
  try {
    return await pb.collection("group_lessons").getFirstListItem(`slug = "${slugOrId}"`)
  } catch {
    return await pb.collection("group_lessons").getOne(slugOrId)
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; lessonSlug: string }> }
) {
  try {
    const { id: groupId, lessonSlug } = await params
    const pb = await getAdminPb()

    let groupTitle = ""
    let instructor: { name: string; surname: string } | null = null
    const g = await pb.collection("groups").getOne(groupId, { expand: "instructor" })
    groupTitle = g.title || ""
    if (g.expand?.instructor) {
      const ins = g.expand.instructor
      instructor = { name: ins.name || "", surname: ins.surname || "" }
    }

    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    if (resolveGroupResourceMode(g, modules) === "default" && g.course) {
      const defaults = await readDefaultCourseLesson(pb, g.course, lessonSlug)
      return NextResponse.json({
        ok: true,
        resourceMode: "default",
        lesson: defaults.lesson,
        module: defaults.module ? { id: defaults.module.id, title: defaults.module.title || "", order: defaults.module.order ?? 0 } : null,
        moduleIndex: defaults.moduleIndex,
        lessonIndex: defaults.lessonIndex,
        groupId,
        groupTitle,
        instructor,
        allModules: defaults.resources.modules.map((m: any) => ({ id: m.id, title: m.title || "", order: m.order ?? 0 })),
        allLessons: defaults.resources.lessons.map((l: any) => ({ id: l.id, title: l.title || "", order: l.order ?? 0, moduleId: l.moduleId || "" })),
        moduleLessons: defaults.moduleLessons.map((l: any) => ({ id: l.id, title: l.title || "", order: l.order ?? 0 })),
        videos: defaults.videos,
        lessonAttachments: defaults.lessonAttachments,
        videoAttachments: [],
      })
    }

    const lesson = await getLessonBySlugOrId(pb, lessonSlug)
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
      groupTitle,
      instructor,
      allModules: sortedMods.map((m: any) => ({ id: m.id, title: m.title || "", order: m.order ?? 0 })),
      allLessons: moduleLessons.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((l: any) => ({ id: l.id, title: l.title || "", order: l.order ?? 0, moduleId: l.module_id || "" })),
      moduleLessons: modLessons.map((l: any) => ({ id: l.id, title: l.title || "", order: l.order ?? 0 })),
      videos: videos.map((v: any) => ({
        id: v.id, lessonId: v.lesson_id, title: v.title || "", driveUrl: v.drive_url || "", description: v.description || "",
      })),
      lessonAttachments: lessonAttachments.map((a: any) => ({
        id: a.id, lessonId: a.lesson_id, name: a.name || a.file || "",
        url: a.file ? `${PB_FILE_URL}/api/files/lesson_attachments/${a.id}/${a.file}` : null,
      })),
      videoAttachments: videoAttachments.map((a: any) => ({
        id: a.id, videoId: a.video_id, name: a.name || a.file || "",
        url: a.file ? `${PB_FILE_URL}/api/files/video_attachments/${a.id}/${a.file}` : null,
      })),
    })
  } catch (err: any) {
    console.error("LESSON GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; lessonSlug: string }> }
) {
  try {
    const { id: groupId, lessonSlug } = await params
    const body = await req.json()
    const pb = await getAdminPb()
    const group = await pb.collection("groups").getOne(groupId)
    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    if (resolveGroupResourceMode(group, modules) === "default") {
      return NextResponse.json({ error: "Passez en ressources personnalisees pour modifier cette lecon." }, { status: 409 })
    }

    const lesson = await getLessonBySlugOrId(pb, lessonSlug)

    const updateData: any = {
      title: body.title,
      description: body.description,
      content: body.content,
    }

    // Regenerate slug if title changed
    if (body.title && body.title !== lesson.title) {
      const base = body.title.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "").trim()
        .replace(/\s+/g, "-").replace(/-+/g, "-") || "lecon"
      const allLessons = await pb.collection("group_lessons").getFullList({ filter: `group_id = "${groupId}"` })
      const usedSlugs = new Set((allLessons as any[]).filter(l => l.id !== lesson.id).map((l: any) => l.slug).filter(Boolean))
      let slug = base; let n = 2
      while (usedSlugs.has(slug)) { slug = `${base}-${n++}` }
      updateData.slug = slug
    }

    const record = await pb.collection("group_lessons").update(lesson.id, updateData)
    return NextResponse.json({
      ok: true,
      lesson: {
        id: record.id,
        slug: record.slug || record.id,
        title: record.title || "",
        description: record.description || "",
        content: record.content || "",
        order: record.order ?? 0,
        moduleId: record.module_id || "",
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
