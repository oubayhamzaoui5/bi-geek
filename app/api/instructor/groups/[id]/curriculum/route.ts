import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { readDefaultCourseResources, resolveGroupResourceMode } from "@/lib/server-course-resources"

export const dynamic = "force-dynamic"

/*
  PocketBase collections required (create in PocketBase admin):
  ─ group_modules      fields: group_id(text), title(text), order(number), description(text)
  ─ group_lessons      fields: group_id(text), module_id(text), title(text), order(number), description(text), content(text)
  ─ lesson_videos      fields: lesson_id(text), title(text), order(number), drive_url(text), description(text)
  ─ lesson_attachments fields: lesson_id(text), name(text), file(file), order(number)
  ─ video_attachments  fields: video_id(text), name(text), file(file)
  ─ module_videos      fields: module_id(text), group_id(text), title(text), drive_url(text), description(text), order(number)
  ─ module_attachments fields: module_id(text), group_id(text), name(text), file(file), order(number)
*/

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "lecon"
}

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

function attachmentUrl(collection: string, recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${collection}/${recordId}/${filename}`
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

async function cloneCourseDefaultsToGroup(pb: any, group: any, groupId: string) {
  const source = await readDefaultCourseResources(pb, group.course)
  const moduleIdMap = new Map<string, string>()
  const lessonIdMap = new Map<string, string>()

  for (const module of source.modules) {
    const created = await pb.collection("group_modules").create({
      group_id: groupId,
      title: module.title || "Nouveau module",
      description: module.description || "",
      order: module.order ?? 0,
    })
    moduleIdMap.set(module.id, created.id)
  }

  for (const lesson of source.lessons) {
    const moduleId = moduleIdMap.get(lesson.moduleId)
    if (!moduleId) continue
    const created = await pb.collection("group_lessons").create({
      group_id: groupId,
      module_id: moduleId,
      title: lesson.title || "Nouvelle lecon",
      slug: lesson.slug || lesson.id,
      description: lesson.description || "",
      content: lesson.content || "",
      order: lesson.order ?? 0,
    })
    lessonIdMap.set(lesson.id, created.id)
  }

  for (const video of source.videos) {
    const lessonId = lessonIdMap.get(video.lessonId)
    if (!lessonId) continue
    await pb.collection("lesson_videos").create({
      lesson_id: lessonId,
      title: video.title || "Nouvelle video",
      drive_url: video.driveUrl || "",
      description: video.description || "",
      order: video.order ?? 0,
    })
  }

  for (const video of source.moduleVideos || []) {
    const moduleId = moduleIdMap.get(video.moduleId)
    if (!moduleId) continue
    await pb.collection("module_videos").create({
      module_id: moduleId,
      group_id: groupId,
      title: video.title || "Nouvelle video",
      drive_url: video.driveUrl || "",
      description: video.description || "",
      order: video.order ?? 0,
    })
  }

  for (const attachment of source.lessonAttachments) {
    const lessonId = lessonIdMap.get(attachment.lessonId)
    if (!lessonId || !attachment.url) continue
    try {
      const res = await fetch(attachment.url)
      if (!res.ok) continue
      const blob = await res.blob()
      const form = new FormData()
      form.append("lesson_id", lessonId)
      form.append("name", attachment.title || attachment.name || "document")
      form.append("order", String(attachment.order ?? 0))
      form.append("file", blob, attachment.name || "document.pdf")
      await pb.collection("lesson_attachments").create(form)
    } catch {}
  }

  for (const attachment of source.moduleAttachments || []) {
    const moduleId = moduleIdMap.get(attachment.moduleId)
    if (!moduleId || !attachment.url) continue
    try {
      const res = await fetch(attachment.url)
      if (!res.ok) continue
      const blob = await res.blob()
      const form = new FormData()
      form.append("module_id", moduleId)
      form.append("group_id", groupId)
      form.append("name", attachment.title || attachment.name || "document")
      form.append("order", String(attachment.order ?? 0))
      form.append("file", blob, attachment.name || "document.pdf")
      await pb.collection("module_attachments").create(form)
    } catch {}
  }

  await pb.collection("groups").update(groupId, { resourceMode: "custom" })
}

// ── GET: full curriculum tree ──────────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()

    const group = await pb.collection("groups").getOne(groupId)
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
      modules: modules.map((m: any) => ({
        id: m.id,
        title: m.title || "",
        order: m.order ?? 0,
        description: m.description || "",
      })),
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
    console.error("CURRICULUM GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// ── POST: create module | lesson | video ───────────────────────────────────────
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const body = await req.json()
    const pb = await getAdminPb()
    const { type, ...data } = body
    const group = await pb.collection("groups").getOne(groupId)
    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    if (type === "clone_course_defaults") {
      if (!group.course) return NextResponse.json({ error: "Ce groupe n'est pas lie a une formation." }, { status: 400 })
      if (modules.length === 0) await cloneCourseDefaultsToGroup(pb, group, groupId)
      else await pb.collection("groups").update(groupId, { resourceMode: "custom" })
      return NextResponse.json({ ok: true, resourceMode: "custom" })
    }
    if (resolveGroupResourceMode(group, modules) === "default") {
      return NextResponse.json({ error: "Passez en ressources personnalisees pour modifier ce programme." }, { status: 409 })
    }

    if (type === "module") {
      const existing = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`)
      const record = await pb.collection("group_modules").create({
        group_id: groupId,
        title: data.title || "Nouveau module",
        description: data.description || "",
        order: existing.length,
      })
      return NextResponse.json({
        ok: true,
        module: { id: record.id, title: record.title, order: record.order ?? 0, description: record.description || "" },
      })
    }

    if (type === "lesson") {
      const existing = await safeGetList(pb, "group_lessons", `module_id = "${data.moduleId}"`)
      const baseSlug = toSlug(data.title || "nouvelle-lecon")
      // ensure slug is unique within this group
      const allLessons = await safeGetList(pb, "group_lessons", `group_id = "${groupId}"`)
      const usedSlugs = new Set(allLessons.map((l: any) => l.slug).filter(Boolean))
      let slug = baseSlug
      let n = 2
      while (usedSlugs.has(slug)) { slug = `${baseSlug}-${n++}` }
      const record = await pb.collection("group_lessons").create({
        group_id: groupId,
        module_id: data.moduleId,
        title: data.title || "Nouvelle leçon",
        slug,
        description: data.description || "",
        content: data.content || "",
        order: data.order ?? existing.length,
      })
      return NextResponse.json({
        ok: true,
        lesson: {
          id: record.id,
          slug: record.slug || record.id,
          moduleId: record.module_id,
          title: record.title,
          order: record.order ?? 0,
          description: record.description || "",
          content: record.content || "",
        },
      })
    }

    if (type === "video") {
      const existing = await safeGetList(pb, "lesson_videos", `lesson_id = "${data.lessonId}"`)
      const record = await pb.collection("lesson_videos").create({
        lesson_id: data.lessonId,
        title: data.title || "Nouvelle vidéo",
        drive_url: data.driveUrl || "",
        description: data.description || "",
        order: existing.length,
      })
      return NextResponse.json({
        ok: true,
        video: {
          id: record.id,
          lessonId: record.lesson_id,
          title: record.title,
          driveUrl: record.drive_url || "",
          description: record.description || "",
        },
      })
    }

    if (type === "module_video") {
      const existing = await safeGetList(pb, "module_videos", `module_id = "${data.moduleId}"`)
      const record = await pb.collection("module_videos").create({
        module_id: data.moduleId,
        group_id: groupId,
        title: data.title || "Nouvelle vidéo",
        drive_url: data.driveUrl || "",
        description: data.description || "",
        order: data.order ?? existing.length,
      })
      return NextResponse.json({
        ok: true,
        moduleVideo: {
          id: record.id,
          moduleId: record.module_id,
          title: record.title,
          driveUrl: record.drive_url || "",
          description: record.description || "",
          order: record.order ?? 0,
        },
      })
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (err: any) {
    console.error("CURRICULUM POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// ── PATCH: update module | lesson | video ──────────────────────────────────────
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const body = await req.json()
    const pb = await getAdminPb()
    const { type, id, ...data } = body
    const group = await pb.collection("groups").getOne(groupId)
    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    if (resolveGroupResourceMode(group, modules) === "default") {
      return NextResponse.json({ error: "Passez en ressources personnalisees pour modifier ce programme." }, { status: 409 })
    }

    if (type === "module") {
      const record = await pb.collection("group_modules").update(id, {
        title: data.title,
        description: data.description,
      })
      return NextResponse.json({
        ok: true,
        module: { id: record.id, title: record.title, order: record.order ?? 0, description: record.description || "" },
      })
    }

    if (type === "lesson") {
      const existing = await pb.collection("group_lessons").getOne(id)
      const updateData: any = { title: data.title, description: data.description, content: data.content }
      if (data.title && data.title !== existing.title) {
        const baseSlug = toSlug(data.title)
        const allLessons = await safeGetList(pb, "group_lessons", `group_id = "${groupId}"`)
        const usedSlugs = new Set(allLessons.filter((l: any) => l.id !== id).map((l: any) => l.slug).filter(Boolean))
        let slug = baseSlug
        let n = 2
        while (usedSlugs.has(slug)) { slug = `${baseSlug}-${n++}` }
        updateData.slug = slug
      }
      const record = await pb.collection("group_lessons").update(id, updateData)
      return NextResponse.json({
        ok: true,
        lesson: {
          id: record.id,
          slug: record.slug || record.id,
          moduleId: record.module_id,
          title: record.title,
          order: record.order ?? 0,
          description: record.description || "",
          content: record.content || "",
        },
      })
    }

    if (type === "video") {
      const record = await pb.collection("lesson_videos").update(id, {
        title: data.title,
        drive_url: data.driveUrl,
        description: data.description,
      })
      return NextResponse.json({
        ok: true,
        video: {
          id: record.id,
          lessonId: record.lesson_id,
          title: record.title,
          order: record.order ?? 0,
          driveUrl: record.drive_url || "",
          description: record.description || "",
        },
      })
    }

    if (type === "reorder_modules") {
      const order: string[] = data.order
      for (let i = 0; i < order.length; i++) {
        await pb.collection("group_modules").update(order[i], { order: i })
      }
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_lessons") {
      const order: string[] = data.order
      for (let i = 0; i < order.length; i++) {
        await pb.collection("group_lessons").update(order[i], { order: i })
      }
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_videos") {
      const order: string[] = data.order
      for (let i = 0; i < order.length; i++) {
        await pb.collection("lesson_videos").update(order[i], { order: i })
      }
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_lesson_attachments") {
      const order: string[] = data.order
      for (let i = 0; i < order.length; i++) {
        await pb.collection("lesson_attachments").update(order[i], { order: i })
      }
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_module_items") {
      const items: { type: string; id: string }[] = data.items
      for (let i = 0; i < items.length; i++) {
        const { type: itemType, id: itemId } = items[i]
        if (itemType === "lesson") await pb.collection("group_lessons").update(itemId, { order: i })
        else if (itemType === "module_video") await pb.collection("module_videos").update(itemId, { order: i })
        else if (itemType === "module_attachment") await pb.collection("module_attachments").update(itemId, { order: i })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (err: any) {
    console.error("CURRICULUM PATCH ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// ── DELETE: remove module | lesson | video | attachment ────────────────────────
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const body = await req.json()
    const pb = await getAdminPb()
    const { type, id } = body
    const group = await pb.collection("groups").getOne(groupId)
    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    if (resolveGroupResourceMode(group, modules) === "default") {
      return NextResponse.json({ error: "Passez en ressources personnalisees pour modifier ce programme." }, { status: 409 })
    }

    if (type === "module") {
      // Cascade: delete lessons → videos → attachments, plus module-level videos/attachments
      const lessons = await safeGetList(pb, "group_lessons", `module_id = "${id}"`, "created")
      for (const lesson of lessons) {
        const videos = await safeGetList(pb, "lesson_videos", `lesson_id = "${lesson.id}"`, "created")
        for (const video of videos) {
          const vatts = await safeGetList(pb, "video_attachments", `video_id = "${video.id}"`, "created")
          for (const a of vatts) try { await pb.collection("video_attachments").delete(a.id) } catch {}
          try { await pb.collection("lesson_videos").delete(video.id) } catch {}
        }
        const latts = await safeGetList(pb, "lesson_attachments", `lesson_id = "${lesson.id}"`, "created")
        for (const a of latts) try { await pb.collection("lesson_attachments").delete(a.id) } catch {}
        try { await pb.collection("group_lessons").delete(lesson.id) } catch {}
      }
      const modVids = await safeGetList(pb, "module_videos", `module_id = "${id}"`, "created")
      for (const v of modVids) try { await pb.collection("module_videos").delete(v.id) } catch {}
      const modAtts = await safeGetList(pb, "module_attachments", `module_id = "${id}"`, "created")
      for (const a of modAtts) try { await pb.collection("module_attachments").delete(a.id) } catch {}
      await pb.collection("group_modules").delete(id)
    }

    if (type === "lesson") {
      const videos = await safeGetList(pb, "lesson_videos", `lesson_id = "${id}"`, "created")
      for (const video of videos) {
        const vatts = await safeGetList(pb, "video_attachments", `video_id = "${video.id}"`, "created")
        for (const a of vatts) try { await pb.collection("video_attachments").delete(a.id) } catch {}
        try { await pb.collection("lesson_videos").delete(video.id) } catch {}
      }
      const latts = await safeGetList(pb, "lesson_attachments", `lesson_id = "${id}"`, "created")
      for (const a of latts) try { await pb.collection("lesson_attachments").delete(a.id) } catch {}
      await pb.collection("group_lessons").delete(id)
    }

    if (type === "video") {
      const vatts = await safeGetList(pb, "video_attachments", `video_id = "${id}"`, "created")
      for (const a of vatts) try { await pb.collection("video_attachments").delete(a.id) } catch {}
      await pb.collection("lesson_videos").delete(id)
    }

    if (type === "lesson_attachment") {
      await pb.collection("lesson_attachments").delete(id)
    }

    if (type === "video_attachment") {
      await pb.collection("video_attachments").delete(id)
    }

    if (type === "module_video") {
      await pb.collection("module_videos").delete(id)
    }

    if (type === "module_attachment") {
      await pb.collection("module_attachments").delete(id)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("CURRICULUM DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
