import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { authErrorResponse, requireUser, type AuthUser } from "@/lib/server-auth"
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

function normalizeIds(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [String(value)] : []
}

function groupInstructorIds(group: any): string[] {
  const ids = normalizeIds(group?.instructor)
  return group?.programType === "bootcamp" ? ids : ids.slice(0, 1)
}

function instructorRank(group: any, instructorId: string) {
  const ids = groupInstructorIds(group)
  const index = ids.indexOf(instructorId)
  return index === -1 ? ids.length : index
}

function ownerId(record: any, group: any) {
  return record?.instructor_id || groupInstructorIds(group)[0] || ""
}

function canEdit(user: AuthUser, group: any, record: any) {
  return user.role === "admin" || user.role === "admin_agent" || ownerId(record, group) === user.id
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

async function nextRankedOrder(pb: any, group: any, user: AuthUser, collection: string, filter: string) {
  const base = instructorRank(group, user.id) * 100000
  const records = await safeGetList(pb, collection, filter)
  const owned = records.filter((r: any) => ownerId(r, group) === user.id)
  if (owned.length === 0) return base
  return Math.max(base, ...owned.map((r: any) => Number(r.order ?? base))) + 1
}

async function nextModuleItemOrder(pb: any, group: any, user: AuthUser, moduleId: string) {
  const base = instructorRank(group, user.id) * 100000
  const [moduleVideos, moduleAttachments] = await Promise.all([
    safeGetList(pb, "module_videos", `module_id = "${moduleId}"`),
    safeGetList(pb, "module_attachments", `module_id = "${moduleId}"`),
  ])
  const owned = [...moduleVideos, ...moduleAttachments].filter((r: any) => ownerId(r, group) === user.id)
  if (owned.length === 0) return base
  return Math.max(base, ...owned.map((r: any) => Number(r.order ?? base))) + 1
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
  const firstInstructorId = groupInstructorIds(group)[0] || ""

  for (const module of source.modules) {
    const created = await pb.collection("group_modules").create({
      group_id: groupId,
      instructor_id: firstInstructorId,
      title: module.title || "Nouveau module",
      description: module.description || "",
      order: module.order ?? 0,
    })
    moduleIdMap.set(module.id, created.id)
  }

  for (const video of source.moduleVideos || []) {
    const moduleId = moduleIdMap.get(video.moduleId)
    if (!moduleId) continue
    await pb.collection("module_videos").create({
      module_id: moduleId,
      group_id: groupId,
      instructor_id: firstInstructorId,
      title: video.title || "Nouvelle video",
      drive_url: video.driveUrl || "",
      description: video.description || "",
      order: video.order ?? 0,
    })
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
      form.append("instructor_id", firstInstructorId)
      form.append("name", attachment.title || attachment.name || "document")
      form.append("order", String(attachment.order ?? 0))
      form.append("file", blob, attachment.name || "document.pdf")
      await pb.collection("module_attachments").create(form)
    } catch {}
  }

  await pb.collection("groups").update(groupId, { resourceMode: "custom" })
}

// ── GET: full curriculum tree ──────────────────────────────────────────────────
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()

    const { user, group, error } = await requireGroupEditor(req, pb, groupId)
    if (error) return error
    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    const resourceMode = resolveGroupResourceMode(group, modules)
    if (resourceMode === "default" && group.course) {
      const source = await readDefaultCourseResources(pb, group.course)
      return NextResponse.json({
        ok: true,
        modules: (source.modules || []).map((m: any) => ({
          ...m,
          instructorId: m.instructorId || groupInstructorIds(group)[0] || "",
          canEdit: true,
        })),
        moduleVideos: (source.moduleVideos || []).map((v: any) => ({
          ...v,
          instructorId: v.instructorId || groupInstructorIds(group)[0] || "",
          canEdit: true,
        })),
        moduleAttachments: (source.moduleAttachments || []).map((a: any) => ({
          ...a,
          instructorId: a.instructorId || groupInstructorIds(group)[0] || "",
          canEdit: true,
        })),
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
      modules: modules.map((m: any) => ({
        id: m.id,
        title: m.title || "",
        order: m.order ?? 0,
        description: m.description || "",
        instructorId: m.instructor_id || ownerId(m, group),
        canEdit: canEdit(user, group, m),
      })),
      moduleVideos: moduleVideos.map((v: any) => ({
        id: v.id,
        moduleId: v.module_id || "",
        title: v.title || "",
        order: v.order ?? 0,
        driveUrl: v.drive_url || "",
        description: v.description || "",
        instructorId: v.instructor_id || ownerId(v, group),
        canEdit: canEdit(user, group, v),
      })),
      moduleAttachments: moduleAttachments.map((a: any) => ({
        id: a.id,
        moduleId: a.module_id || "",
        name: a.name || a.file || "",
        url: a.file ? attachmentUrl("module_attachments", a.id, a.file) : null,
        order: a.order ?? 999,
        instructorId: a.instructor_id || ownerId(a, group),
        canEdit: canEdit(user, group, a),
      })),
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
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
    const { user, group, error } = await requireGroupEditor(req, pb, groupId)
    if (error) return error
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
      const record = await pb.collection("group_modules").create({
        group_id: groupId,
        instructor_id: user.id,
        title: data.title || "Nouveau module",
        description: data.description || "",
        order: await nextRankedOrder(pb, group, user, "group_modules", `group_id = "${groupId}"`),
      })
      return NextResponse.json({
        ok: true,
        module: { id: record.id, title: record.title, order: record.order ?? 0, description: record.description || "", instructorId: record.instructor_id || user.id },
      })
    }

    if (type === "lesson") {
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
        instructor_id: user.id,
        title: data.title || "Nouvelle leçon",
        slug,
        description: data.description || "",
        content: data.content || "",
        order: await nextModuleItemOrder(pb, group, user, data.moduleId),
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
          instructorId: record.instructor_id || user.id,
        },
      })
    }

    if (type === "video") {
      const record = await pb.collection("lesson_videos").create({
        lesson_id: data.lessonId,
        instructor_id: user.id,
        title: data.title || "Nouvelle vidéo",
        drive_url: data.driveUrl || "",
        description: data.description || "",
        order: await nextRankedOrder(pb, group, user, "lesson_videos", `lesson_id = "${data.lessonId}"`),
      })
      return NextResponse.json({
        ok: true,
        video: {
          id: record.id,
          lessonId: record.lesson_id,
          title: record.title,
          driveUrl: record.drive_url || "",
          description: record.description || "",
          order: record.order ?? 0,
          instructorId: record.instructor_id || user.id,
        },
      })
    }

    if (type === "module_video") {
      const record = await pb.collection("module_videos").create({
        module_id: data.moduleId,
        group_id: groupId,
        instructor_id: user.id,
        title: data.title || "Nouvelle vidéo",
        drive_url: data.driveUrl || "",
        description: data.description || "",
        order: await nextModuleItemOrder(pb, group, user, data.moduleId),
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
          instructorId: record.instructor_id || user.id,
        },
      })
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
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
    const { user, group, error } = await requireGroupEditor(req, pb, groupId)
    if (error) return error
    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    if (resolveGroupResourceMode(group, modules) === "default") {
      return NextResponse.json({ error: "Passez en ressources personnalisees pour modifier ce programme." }, { status: 409 })
    }

    if (type === "module") {
      const moduleRecord = await pb.collection("group_modules").getOne(id)
      if (!canEdit(user, group, moduleRecord)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
      const existing = await pb.collection("group_modules").getOne(id)
      if (!canEdit(user, group, existing)) return NextResponse.json({ error: "Vous ne pouvez modifier que vos ressources." }, { status: 403 })
      const record = await pb.collection("group_modules").update(id, {
        title: data.title,
        description: data.description,
      })
      return NextResponse.json({
        ok: true,
        module: { id: record.id, title: record.title, order: record.order ?? 0, description: record.description || "", instructorId: record.instructor_id || ownerId(record, group) },
      })
    }

    if (type === "lesson") {
      const lessonRecord = await pb.collection("group_lessons").getOne(id)
      if (!canEdit(user, group, lessonRecord)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
      const existing = await pb.collection("group_lessons").getOne(id)
      if (!canEdit(user, group, existing)) return NextResponse.json({ error: "Vous ne pouvez modifier que vos ressources." }, { status: 403 })
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
          instructorId: record.instructor_id || ownerId(record, group),
        },
      })
    }

    if (type === "video") {
      const videoRecord = await pb.collection("lesson_videos").getOne(id)
      if (!canEdit(user, group, videoRecord)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
      const existing = await pb.collection("lesson_videos").getOne(id)
      if (!canEdit(user, group, existing)) return NextResponse.json({ error: "Vous ne pouvez modifier que vos ressources." }, { status: 403 })
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
          instructorId: record.instructor_id || ownerId(record, group),
        },
      })
    }

    if (type === "reorder_modules") {
      const order: string[] = data.order
      for (let i = 0; i < order.length; i++) {
        const record = await pb.collection("group_modules").getOne(order[i])
        if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez reordonner que vos ressources." }, { status: 403 })
        await pb.collection("group_modules").update(order[i], { order: instructorRank(group, ownerId(record, group)) * 100000 + i })
      }
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_lessons") {
      const order: string[] = data.order
      for (let i = 0; i < order.length; i++) {
        const record = await pb.collection("group_lessons").getOne(order[i])
        if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez reordonner que vos ressources." }, { status: 403 })
        await pb.collection("group_lessons").update(order[i], { order: instructorRank(group, ownerId(record, group)) * 100000 + i })
      }
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_videos") {
      const order: string[] = data.order
      for (let i = 0; i < order.length; i++) {
        const record = await pb.collection("lesson_videos").getOne(order[i])
        if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez reordonner que vos ressources." }, { status: 403 })
        await pb.collection("lesson_videos").update(order[i], { order: instructorRank(group, ownerId(record, group)) * 100000 + i })
      }
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_lesson_attachments") {
      const order: string[] = data.order
      for (let i = 0; i < order.length; i++) {
        const record = await pb.collection("lesson_attachments").getOne(order[i])
        if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez reordonner que vos ressources." }, { status: 403 })
        await pb.collection("lesson_attachments").update(order[i], { order: instructorRank(group, ownerId(record, group)) * 100000 + i })
      }
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_module_items") {
      const items: { type: string; id: string }[] = data.items
      for (let i = 0; i < items.length; i++) {
        const { type: itemType, id: itemId } = items[i]
        const collection = itemType === "lesson" ? "group_lessons" : itemType === "module_video" ? "module_videos" : itemType === "module_attachment" ? "module_attachments" : null
        if (!collection) continue
        const record = await pb.collection(collection).getOne(itemId)
        if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez reordonner que vos ressources." }, { status: 403 })
        await pb.collection(collection).update(itemId, { order: instructorRank(group, ownerId(record, group)) * 100000 + i })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
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
    const { user, group, error } = await requireGroupEditor(req, pb, groupId)
    if (error) return error
    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    if (resolveGroupResourceMode(group, modules) === "default") {
      return NextResponse.json({ error: "Passez en ressources personnalisees pour modifier ce programme." }, { status: 409 })
    }

    if (type === "module") {
      const moduleRecord = await pb.collection("group_modules").getOne(id)
      if (!canEdit(user, group, moduleRecord)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
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
      const lessonRecord = await pb.collection("group_lessons").getOne(id)
      if (!canEdit(user, group, lessonRecord)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
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
      const videoRecord = await pb.collection("lesson_videos").getOne(id)
      if (!canEdit(user, group, videoRecord)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
      const vatts = await safeGetList(pb, "video_attachments", `video_id = "${id}"`, "created")
      for (const a of vatts) try { await pb.collection("video_attachments").delete(a.id) } catch {}
      await pb.collection("lesson_videos").delete(id)
    }

    if (type === "lesson_attachment") {
      const record = await pb.collection("lesson_attachments").getOne(id)
      if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
      await pb.collection("lesson_attachments").delete(id)
    }

    if (type === "video_attachment") {
      const record = await pb.collection("video_attachments").getOne(id)
      if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
      await pb.collection("video_attachments").delete(id)
    }

    if (type === "module_video") {
      const record = await pb.collection("module_videos").getOne(id)
      if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
      await pb.collection("module_videos").delete(id)
    }

    if (type === "module_attachment") {
      const record = await pb.collection("module_attachments").getOne(id)
      if (!canEdit(user, group, record)) return NextResponse.json({ error: "Vous ne pouvez supprimer que vos ressources." }, { status: 403 })
      await pb.collection("module_attachments").delete(id)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("CURRICULUM DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
