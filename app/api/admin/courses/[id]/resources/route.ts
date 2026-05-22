import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

export const dynamic = "force-dynamic"

type VideoLink = { url?: string; driveUrl?: string; title?: string; description?: string; order?: number }

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!,
  )
  return pb
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "lecon"
}

function toFileArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return [value as string]
}

function toVideoLinks(value: unknown): VideoLink[] {
  return Array.isArray(value) ? value : []
}

function toAttachmentMeta(value: unknown): { name: string; title?: string; description?: string; order?: number }[] {
  return Array.isArray(value) ? value : []
}

function attachmentUrl(recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/course_lessons/${recordId}/${filename}`
}

function moduleAttachmentUrl(recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/course_modules/${recordId}/${filename}`
}

function videoToResponse(lessonId: string, link: VideoLink, index: number) {
  return {
    id: `${lessonId}:video:${index}`,
    lessonId,
    title: link.title || `Video ${index + 1}`,
    order: link.order ?? index,
    driveUrl: link.driveUrl || link.url || "",
    description: link.description || "",
  }
}

function moduleVideoToResponse(moduleId: string, link: VideoLink, index: number) {
  return {
    id: `${moduleId}:module_video:${index}`,
    moduleId,
    title: link.title || `Video ${index + 1}`,
    order: link.order ?? index,
    driveUrl: link.driveUrl || link.url || "",
    description: link.description || "",
  }
}

function attachmentToResponse(lesson: any, filename: string, index: number) {
  const meta = toAttachmentMeta(lesson.attachmentsMeta).find(m => m.name === filename)
  return {
    id: `${lesson.id}:attachment:${encodeURIComponent(filename)}`,
    lessonId: lesson.id,
    name: filename,
    title: meta?.title || filename,
    description: meta?.description || "",
    order: meta?.order ?? index,
    url: attachmentUrl(lesson.id, filename),
  }
}

function moduleAttachmentToResponse(module: any, filename: string, index: number) {
  const meta = toAttachmentMeta(module.resourceAttachmentsMeta).find(m => m.name === filename)
  return {
    id: `${module.id}:module_attachment:${encodeURIComponent(filename)}`,
    moduleId: module.id,
    name: filename,
    title: meta?.title || filename,
    description: meta?.description || "",
    order: meta?.order ?? index,
    url: moduleAttachmentUrl(module.id, filename),
  }
}

async function readCourseResources(pb: PocketBase, courseId: string) {
  const [course, modules, lessons] = await Promise.all([
    pb.collection("courses").getOne(courseId),
    pb.collection("course_modules").getFullList({ filter: `course="${courseId}"`, sort: "order" }),
    pb.collection("course_lessons").getFullList({ filter: `course="${courseId}"`, sort: "module,order" }),
  ])

  const videos = lessons.flatMap((lesson: any) =>
    toVideoLinks(lesson.youtubeLinks).map((link, index) => videoToResponse(lesson.id, link, index)),
  )
  const lessonAttachments = lessons.flatMap((lesson: any) =>
    toFileArray(lesson.attachments).map((filename, index) => attachmentToResponse(lesson, filename, index)),
  )
  const moduleVideos = modules.flatMap((module: any) =>
    toVideoLinks(module.resourceVideos).map((link, index) => moduleVideoToResponse(module.id, link, index)),
  )
  const moduleAttachments = modules.flatMap((module: any) =>
    toFileArray(module.resourceAttachments).map((filename, index) => moduleAttachmentToResponse(module, filename, index)),
  )

  return {
    ok: true,
    course: {
      id: course.id,
      title: course.title || "",
      shortDescription: course.shortDescription || "",
    },
    modules: modules.map((m: any) => ({
      id: m.id,
      title: m.title || "",
      order: m.order ?? 0,
      description: m.description || "",
      durationLabel: m.durationLabel || m.duration || "",
      locked: !!m.locked,
    })),
    lessons: lessons.map((l: any) => ({
      id: l.id,
      slug: l.slug || l.id,
      moduleId: l.module || "",
      title: l.title || "",
      order: l.order ?? 0,
      description: l.description || "",
      content: l.content || "",
      durationLabel: l.durationLabel || l.duration || "",
      locked: !!l.locked,
    })),
    videos,
    lessonAttachments,
    videoAttachments: [],
    moduleVideos,
    moduleAttachments,
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params
    const pb = await getAdminPb()
    return NextResponse.json(await readCourseResources(pb, courseId))
  } catch (err: any) {
    console.error("ADMIN COURSE RESOURCES GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params
    const body = await req.json()
    const pb = await getAdminPb()
    const { type, ...data } = body

    if (type === "module") {
      const existing = await pb.collection("course_modules").getFullList({ filter: `course="${courseId}"` })
      const record = await pb.collection("course_modules").create({
        course: courseId,
        title: data.title || "Nouveau module",
        durationLabel: data.durationLabel || "",
        duration: data.durationLabel || "",
        order: existing.length,
        locked: false,
      })
      return NextResponse.json({ ok: true, module: { id: record.id, title: record.title, order: record.order ?? 0, description: record.description || "", durationLabel: record.durationLabel || "" } })
    }

    if (type === "lesson") {
      const existing = await pb.collection("course_lessons").getFullList({ filter: `module="${data.moduleId}"` })
      const record = await pb.collection("course_lessons").create({
        course: courseId,
        module: data.moduleId,
        title: data.title || "Nouvelle lecon",
        slug: toSlug(data.title || "nouvelle-lecon"),
        durationLabel: data.durationLabel || "",
        duration: data.durationLabel || "",
        description: data.description || "",
        content: data.content || "",
        order: data.order ?? existing.length,
        locked: false,
        attachmentsMeta: [],
        youtubeLinks: [],
      })
      return NextResponse.json({
        ok: true,
        lesson: { id: record.id, slug: record.slug || record.id, moduleId: record.module, title: record.title, order: record.order ?? 0, description: record.description || "", content: record.content || "", durationLabel: record.durationLabel || "" },
      })
    }

    if (type === "video") {
      const lesson = await pb.collection("course_lessons").getOne(data.lessonId)
      const links = toVideoLinks(lesson.youtubeLinks)
      const next = [...links, {
        title: data.title || "Nouvelle video",
        driveUrl: data.driveUrl || "",
        url: data.driveUrl || "",
        description: data.description || "",
        order: links.length,
      }]
      await pb.collection("course_lessons").update(lesson.id, { youtubeLinks: next })
      return NextResponse.json({ ok: true, video: videoToResponse(lesson.id, next[next.length - 1], next.length - 1) })
    }

    if (type === "module_video") {
      const module = await pb.collection("course_modules").getOne(data.moduleId)
      const links = toVideoLinks(module.resourceVideos)
      const next = [...links, {
        title: data.title || "Nouvelle video",
        driveUrl: data.driveUrl || "",
        url: data.driveUrl || "",
        description: data.description || "",
        order: links.length,
      }]
      await pb.collection("course_modules").update(module.id, { resourceVideos: next })
      return NextResponse.json({ ok: true, moduleVideo: moduleVideoToResponse(module.id, next[next.length - 1], next.length - 1) })
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (err: any) {
    console.error("ADMIN COURSE RESOURCES POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const body = await req.json()
    const pb = await getAdminPb()
    const { type, id, ...data } = body

    if (type === "module") {
      const record = await pb.collection("course_modules").update(id, {
        title: data.title,
        durationLabel: data.durationLabel,
        duration: data.durationLabel,
      })
      return NextResponse.json({ ok: true, module: { id: record.id, title: record.title, order: record.order ?? 0, description: record.description || "", durationLabel: record.durationLabel || "" } })
    }

    if (type === "lesson") {
      const record = await pb.collection("course_lessons").update(id, {
        title: data.title,
        durationLabel: data.durationLabel,
        duration: data.durationLabel,
        description: data.description,
        content: data.content,
      })
      return NextResponse.json({ ok: true, lesson: { id: record.id, moduleId: record.module, title: record.title, order: record.order ?? 0, description: record.description || "", content: record.content || "", durationLabel: record.durationLabel || "" } })
    }

    if (type === "video") {
      const lesson = await pb.collection("course_lessons").getOne(data.lessonId)
      const links = toVideoLinks(lesson.youtubeLinks)
      const idx = Number(data.index)
      if (!Number.isInteger(idx) || idx < 0 || idx >= links.length) return NextResponse.json({ error: "Video introuvable" }, { status: 404 })
      links[idx] = { ...links[idx], title: data.title, driveUrl: data.driveUrl, url: data.driveUrl, description: data.description }
      await pb.collection("course_lessons").update(lesson.id, { youtubeLinks: links })
      return NextResponse.json({ ok: true, video: videoToResponse(lesson.id, links[idx], idx) })
    }

    if (type === "module_video") {
      const module = await pb.collection("course_modules").getOne(data.moduleId)
      const links = toVideoLinks(module.resourceVideos)
      const idx = Number(data.index)
      if (!Number.isInteger(idx) || idx < 0 || idx >= links.length) return NextResponse.json({ error: "Video introuvable" }, { status: 404 })
      links[idx] = { ...links[idx], title: data.title, driveUrl: data.driveUrl, url: data.driveUrl, description: data.description }
      await pb.collection("course_modules").update(module.id, { resourceVideos: links })
      return NextResponse.json({ ok: true, moduleVideo: moduleVideoToResponse(module.id, links[idx], idx) })
    }

    if (type === "reorder_modules") {
      const order: string[] = data.order || []
      for (let i = 0; i < order.length; i++) await pb.collection("course_modules").update(order[i], { order: i })
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_lessons") {
      const order: string[] = data.order || []
      for (let i = 0; i < order.length; i++) await pb.collection("course_lessons").update(order[i], { order: i })
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_videos") {
      const lesson = await pb.collection("course_lessons").getOne(data.lessonId)
      const links = toVideoLinks(lesson.youtubeLinks)
      const order: number[] = data.order || []
      const reordered = order.map(i => links[i]).filter(Boolean)
      reordered.forEach((link, index) => { link.order = index })
      await pb.collection("course_lessons").update(lesson.id, { youtubeLinks: reordered })
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_lesson_attachments") {
      const lesson = await pb.collection("course_lessons").getOne(data.lessonId)
      const order: string[] = data.order || []
      const currentMeta = toAttachmentMeta(lesson.attachmentsMeta)
      const nextMeta = order.map((name, index) => {
        const prev = currentMeta.find(m => m.name === name)
        return { name, title: prev?.title || name, description: prev?.description || "", order: index }
      })
      await pb.collection("course_lessons").update(lesson.id, { attachmentsMeta: nextMeta })
      return NextResponse.json({ ok: true })
    }

    if (type === "reorder_module_items") {
      const module = await pb.collection("course_modules").getOne(data.moduleId)
      const items: { type: string; id: string }[] = data.items || []
      const videos = toVideoLinks(module.resourceVideos)
      const attachments = toAttachmentMeta(module.resourceAttachmentsMeta)
      const videoOrder = new Map<string, number>()
      const attachmentOrder = new Map<string, number>()
      items.forEach((item, index) => {
        if (item.type === "module_video") videoOrder.set(item.id, index)
        if (item.type === "module_attachment") attachmentOrder.set(item.id, index)
      })
      videos.forEach((video, index) => { video.order = videoOrder.get(`${module.id}:module_video:${index}`) ?? video.order ?? index })
      attachments.forEach((att, index) => { att.order = attachmentOrder.get(`${module.id}:module_attachment:${encodeURIComponent(att.name)}`) ?? att.order ?? index })
      await pb.collection("course_modules").update(module.id, { resourceVideos: videos, resourceAttachmentsMeta: attachments })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (err: any) {
    console.error("ADMIN COURSE RESOURCES PATCH ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const body = await req.json()
    const pb = await getAdminPb()
    const { type, id, lessonId, moduleId, index, filename } = body

    if (type === "module") {
      const lessons = await pb.collection("course_lessons").getFullList({ filter: `module="${id}"` })
      for (const lesson of lessons as any[]) await pb.collection("course_lessons").delete(lesson.id)
      await pb.collection("course_modules").delete(id)
      return NextResponse.json({ ok: true })
    }

    if (type === "lesson") {
      await pb.collection("course_lessons").delete(id)
      return NextResponse.json({ ok: true })
    }

    if (type === "video") {
      const lesson = await pb.collection("course_lessons").getOne(lessonId)
      const links = toVideoLinks(lesson.youtubeLinks)
      const idx = Number(index)
      links.splice(idx, 1)
      links.forEach((link, i) => { link.order = i })
      await pb.collection("course_lessons").update(lesson.id, { youtubeLinks: links })
      return NextResponse.json({ ok: true })
    }

    if (type === "module_video") {
      const module = await pb.collection("course_modules").getOne(moduleId)
      const links = toVideoLinks(module.resourceVideos)
      const idx = Number(index)
      links.splice(idx, 1)
      links.forEach((link, i) => { link.order = i })
      await pb.collection("course_modules").update(module.id, { resourceVideos: links })
      return NextResponse.json({ ok: true })
    }

    if (type === "lesson_attachment") {
      const lesson = await pb.collection("course_lessons").getOne(lessonId)
      const currentMeta = toAttachmentMeta(lesson.attachmentsMeta).filter(m => m.name !== filename)
      const fd = new FormData()
      fd.append("attachments-", filename)
      fd.append("attachmentsMeta", JSON.stringify(currentMeta))
      const pbUrl = process.env.POCKETBASE_URL!
      const res = await fetch(`${pbUrl}/api/collections/course_lessons/records/${lesson.id}`, {
        method: "PATCH",
        headers: { Authorization: pb.authStore.token },
        body: fd,
      })
      if (!res.ok) throw new Error("Erreur suppression fichier")
      return NextResponse.json({ ok: true })
    }

    if (type === "module_attachment") {
      const module = await pb.collection("course_modules").getOne(moduleId)
      const currentMeta = toAttachmentMeta(module.resourceAttachmentsMeta).filter(m => m.name !== filename)
      const fd = new FormData()
      fd.append("resourceAttachments-", filename)
      fd.append("resourceAttachmentsMeta", JSON.stringify(currentMeta))
      const pbUrl = process.env.POCKETBASE_URL!
      const res = await fetch(`${pbUrl}/api/collections/course_modules/records/${module.id}`, {
        method: "PATCH",
        headers: { Authorization: pb.authStore.token },
        body: fd,
      })
      if (!res.ok) throw new Error("Erreur suppression fichier")
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (err: any) {
    console.error("ADMIN COURSE RESOURCES DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
