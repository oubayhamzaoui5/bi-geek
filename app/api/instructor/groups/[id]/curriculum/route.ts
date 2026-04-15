import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

/*
  PocketBase collections required (create in PocketBase admin):
  ─ group_modules      fields: group_id(text), title(text), order(number), description(text)
  ─ group_lessons      fields: group_id(text), module_id(text), title(text), order(number), description(text), content(text)
  ─ lesson_videos      fields: lesson_id(text), title(text), drive_url(text), description(text)
  ─ lesson_attachments fields: lesson_id(text), name(text), file(file)
  ─ video_attachments  fields: video_id(text), name(text), file(file)
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

function attachmentUrl(collection: string, recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${collection}/${recordId}/${filename}`
}

async function safeGetList(pb: any, collection: string, filter: string, sort = "order") {
  try {
    return await pb.collection(collection).getFullList({ filter, sort })
  } catch {
    return []
  }
}

// ── GET: full curriculum tree ──────────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()

    const modules = await safeGetList(pb, "group_modules", `group_id = "${groupId}"`, "order")
    const lessons = await safeGetList(pb, "group_lessons", `group_id = "${groupId}"`, "order")

    let videos: any[] = []
    let lessonAttachments: any[] = []
    let videoAttachments: any[] = []

    if (lessons.length > 0) {
      const lessonFilter = lessons.map((l: any) => `lesson_id = "${l.id}"`).join(" || ")
      videos = await safeGetList(pb, "lesson_videos", lessonFilter, "created")
      lessonAttachments = await safeGetList(pb, "lesson_attachments", lessonFilter, "created")
    }

    if (videos.length > 0) {
      const videoFilter = videos.map((v: any) => `video_id = "${v.id}"`).join(" || ")
      videoAttachments = await safeGetList(pb, "video_attachments", videoFilter, "created")
    }

    return NextResponse.json({
      ok: true,
      modules: modules.map((m: any) => ({
        id: m.id,
        title: m.title || "",
        order: m.order ?? 0,
        description: m.description || "",
      })),
      lessons: lessons.map((l: any) => ({
        id: l.id,
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
      const record = await pb.collection("group_lessons").create({
        group_id: groupId,
        module_id: data.moduleId,
        title: data.title || "Nouvelle leçon",
        description: data.description || "",
        content: data.content || "",
        order: existing.length,
      })
      return NextResponse.json({
        ok: true,
        lesson: {
          id: record.id,
          moduleId: record.module_id,
          title: record.title,
          order: record.order ?? 0,
          description: record.description || "",
          content: record.content || "",
        },
      })
    }

    if (type === "video") {
      const record = await pb.collection("lesson_videos").create({
        lesson_id: data.lessonId,
        title: data.title || "Nouvelle vidéo",
        drive_url: data.driveUrl || "",
        description: data.description || "",
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

    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  } catch (err: any) {
    console.error("CURRICULUM POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// ── PATCH: update module | lesson | video ──────────────────────────────────────
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const body = await req.json()
    const pb = await getAdminPb()
    const { type, id, ...data } = body

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
      const record = await pb.collection("group_lessons").update(id, {
        title: data.title,
        description: data.description,
        content: data.content,
      })
      return NextResponse.json({
        ok: true,
        lesson: {
          id: record.id,
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
          driveUrl: record.drive_url || "",
          description: record.description || "",
        },
      })
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
    await params
    const body = await req.json()
    const pb = await getAdminPb()
    const { type, id } = body

    if (type === "module") {
      // Cascade: delete lessons → videos → attachments
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

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("CURRICULUM DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
