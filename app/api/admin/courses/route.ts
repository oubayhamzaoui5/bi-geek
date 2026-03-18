// app/api/admin/courses/route.ts
export const runtime = "nodejs"

console.log("NEXT_RUNTIME:", process.env.NEXT_RUNTIME)
import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

// ---------------- TYPES ----------------
type IncomingLesson = {
  id?: string
  title: string
  durationLabel?: string
  order?: number
  locked?: boolean
  attachmentsMeta?: { name: string; title?: string; description?: string; order?: number }[]
  youtubeLinks?: { url: string; title?: string; description?: string; order?: number }[]
}

type IncomingModule = {
  id?: string
  title: string
  durationLabel?: string
  order?: number
  locked?: boolean
  lessons?: IncomingLesson[]
}

type CertificationItem = {
  title: string
  issuer?: string
  description?: string
}

type IncomingCourse = {
  id?: string
  title: string
  shortDescription: string
  longDescription?: string
  durationLabel: string
  prerequis: "Aucun" | "Contacter l'administration"
  certificate?: boolean
  certifications?: CertificationItem[]
  rating?: number
  reviewsCount?: number
  whatYouWillLearn?: string[]
  tags?: string[]
  modules?: IncomingModule[]
}


function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}


async function generateUniqueSlug(pb: PocketBase, title: string) {
  const baseSlug = slugify(title)
  let slug = baseSlug
  let counter = 1

  while (true) {
    try {
      await pb.collection("courses").getFirstListItem(`slug="${slug}"`)
      // slug exists → try next
      counter++
      slug = `${baseSlug}-${counter}`
    } catch {
      // slug not found → safe to use
      return slug
    }
  }
}

// ---------------- POCKETBASE ----------------
async function getAdminPb() {
  const { POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD } = process.env

  if (!POCKETBASE_URL || !POCKETBASE_ADMIN_EMAIL || !POCKETBASE_ADMIN_PASSWORD)
    throw new Error("Variables d'environnement PocketBase manquantes.")

  const pb = new PocketBase(POCKETBASE_URL)
  await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
  return pb
}


/*
export async function GET() {
  try {
    const pb = await getAdminPb()

    const [courseRecords, moduleRecords, lessonRecords] = await Promise.all([
      pb.collection("courses").getFullList({ sort: "title" }),
      pb.collection("course_modules").getFullList({ sort: "course,order" }),
      pb.collection("course_lessons").getFullList({ sort: "course,order" }),
    ])

    // Map modules to courses
    const modulesByCourse = moduleRecords.reduce((map: Map<string, any[]>, m: any) => {
      map.set(m.course, [...(map.get(m.course) ?? []), m])
      return map
    }, new Map<string, any[]>())

    // Map lessons to modules
    const lessonsByModule = lessonRecords.reduce((map: Map<string, any[]>, l: any) => {
      map.set(l.module, [...(map.get(l.module) ?? []), l])
      return map
    }, new Map<string, any[]>())

    const courses = courseRecords.map((c: any) => {
      const mods = modulesByCourse.get(c.id) ?? []
      const modules = mods.map((m: any) => ({
        id: m.id,
        title: m.title,
        durationLabel: m.durationLabel ?? m.duration ?? "",
        order: m.order ?? 0,
        lessons: (lessonsByModule.get(m.id) ?? []).map((l: any) => ({
          id: l.id,
          title: l.title,
          durationLabel: l.durationLabel ?? l.duration ?? "",
          order: l.order ?? 0,
          attachmentsMeta: l.attachmentsMeta ?? [],
          youtubeLinks: l.youtubeLinks ?? [],
        })),
      }))

      return {
        id: c.id,
        title: c.title,
        shortDescription: c.shortDescription,
        longDescription: c.longDescription ?? "",
        durationLabel: c.durationLabel,
        prerequis: c.prerequis ?? "Aucun",
        coverImage: c.coverImage || null,
        attachments: c.attachments ?? [],
        attachmentsMeta: c.attachmentsMeta ?? [],
        youtubeLinks: c.youtubeLinks ?? [],
        certificate: !!c.certificate,
        certifications: c.certifications ?? [],
        rating: c.rating ?? 4.8,
        reviewsCount: c.reviewsCount ?? 0,
        whatYouWillLearn: c.whatYouWillLearn ?? [],
        tags: c.tags ?? [],
        modules: modules ?? [], // Always return an array
      }
    })

    return NextResponse.json({ ok: true, courses })
  } catch (err: any) {
    console.error("ADMIN COURSES GET ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}

 */

// ---------------- GET ----------------
export async function GET() {
  try {
    const pb = await getAdminPb()

    // 1) Fetch all courses
    const courseRecords = await pb.collection("courses").getFullList({ sort: "title" })

    // 2) Fix missing slugs
    for (const course of courseRecords) {
      if (!course.slug || course.slug.trim() === "") {
        const slug = await generateUniqueSlug(pb, course.title)
        await pb.collection("courses").update(course.id, { slug })
        console.log(`Generated slug for course "${course.title}" → ${slug}`)
      }
    }

    // 3) Fetch modules & lessons after slug fix
    const [moduleRecords, lessonRecords] = await Promise.all([
      pb.collection("course_modules").getFullList({ sort: "course,order" }),
      pb.collection("course_lessons").getFullList({ sort: "course,order" }),
    ])

    // Map modules to courses
    const modulesByCourse = moduleRecords.reduce((map: Map<string, any[]>, m: any) => {
      map.set(m.course, [...(map.get(m.course) ?? []), m])
      return map
    }, new Map<string, any[]>())

    // Map lessons to modules
    const lessonsByModule = lessonRecords.reduce((map: Map<string, any[]>, l: any) => {
      map.set(l.module, [...(map.get(l.module) ?? []), l])
      return map
    }, new Map<string, any[]>())

    const courses = courseRecords.map((c: any) => {
      const mods = modulesByCourse.get(c.id) ?? []
      const modules = mods.map((m: any) => ({
        id: m.id,
        title: m.title,
        durationLabel: m.durationLabel ?? m.duration ?? "",
        order: m.order ?? 0,
        locked: !!m.locked,
        lessons: (lessonsByModule.get(m.id) ?? []).map((l: any) => ({
          id: l.id,
          title: l.title,
          durationLabel: l.durationLabel ?? l.duration ?? "",
          order: l.order ?? 0,
          locked: !!l.locked,
          attachmentsMeta: l.attachmentsMeta ?? [],
          youtubeLinks: l.youtubeLinks ?? [],
          attachments: l.attachments ?? [],
        })),
      }))

      return {
        id: c.id,
        title: c.title,
        shortDescription: c.shortDescription,
        longDescription: c.longDescription ?? "",
        durationLabel: c.durationLabel,
        prerequis: c.prerequis ?? "Aucun",
        coverImage: c.coverImage || null,
        certificate: !!c.certificate,
        certifications: c.certifications ?? [],
        rating: c.rating ?? 4.8,
        reviewsCount: c.reviewsCount ?? 0,
        whatYouWillLearn: c.whatYouWillLearn ?? [],
        tags: c.tags ?? [],
        modules: modules ?? [], // Always return an array
      }
    })

    return NextResponse.json({ ok: true, courses })
  } catch (err: any) {
    console.error("ADMIN COURSES GET ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}

// ---------------- POST ----------------
export async function POST(req: Request) {
  console.log("🟢 POST /api/admin/courses START")

  try {
    const pb = await getAdminPb()
    console.log("✅ PocketBase admin authenticated")

    const formData = await req.formData()
    console.log("📦 RAW FORMDATA CONTENTS:")
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File] name=${value.name} size=${value.size}`)
      } else {
        console.log(`  ${key}:`, value)
      }
    }

    // ---------------- PARSE DATA ----------------
    const parseJSON = <T>(value: FormDataEntryValue | null, defaultValue: T) => {
      try {
        return value ? JSON.parse(value.toString()) : defaultValue
      } catch {
        return defaultValue
      }
    }

    const id = formData.get("id")?.toString()
    const title = formData.get("title")?.toString() || ""
    const shortDescription = formData.get("shortDescription")?.toString() || ""
    const longDescription = formData.get("longDescription")?.toString() || ""
    const durationLabel = formData.get("durationLabel")?.toString() || ""
    const prerequis = (formData.get("prerequis")?.toString() || "Aucun") as
      | "Aucun"
      | "Contacter l'administration"

    const certificate = formData.get("certificate") === "true"
    const certifications: CertificationItem[] = parseJSON(formData.get("certifications"), [])
    const modules: IncomingModule[] = parseJSON(formData.get("modules"), [])
    const whatYouWillLearn: string[] = parseJSON(formData.get("whatYouWillLearn"), [])
    const tags: string[] = parseJSON(formData.get("tags"), [])

    const rating = Number(formData.get("rating") ?? 4.8)
    const reviewsCount = Number(formData.get("reviewsCount") ?? 0)

    // ---------------- VALIDATION ----------------
    if (!title || !shortDescription || !durationLabel || !prerequis)
      return NextResponse.json(
        { error: "Le titre, la description courte, la durée et les prérequis sont obligatoires." },
        { status: 400 },
      )

    if (certificate && certifications.length === 0)
      return NextResponse.json(
        { error: "Au moins une certification est requise si l'option certificat est activée." },
        { status: 400 },
      )

    // ---------------- COURSE PAYLOAD ----------------
    const payload: any = {
      title,
      shortDescription,
      longDescription: longDescription || shortDescription,
      durationLabel,
      prerequis,
      certificate,
      certifications,
      rating,
      reviewsCount,
      whatYouWillLearn,
      tags,
      isPublished: true,
    }

    const coverImage = formData.get("coverImage")
    if (coverImage instanceof File && coverImage.size > 0) {
      payload.coverImage = coverImage
    }


    // ---------------- CREATE OR UPDATE ----------------
    let courseRecord

    if (id) {
      // UPDATE → keep existing slug
      courseRecord = await pb.collection("courses").update(id, payload)
    } else {
      // CREATE → generate slug once
      const slug = await generateUniqueSlug(pb, title)
      courseRecord = await pb.collection("courses").create({
        ...payload,
        slug,
      })
    }

    const courseId = courseRecord.id


    // ---------------- SYNC MODULES & LESSONS ----------------
    const existingModules = await pb.collection("course_modules").getFullList({
      filter: `course="${courseId}"`,
    })
    const existingModulesById = new Map<string, any>(
      existingModules.map((m: any) => [m.id, m])
    )

    const existingLessons = await pb.collection("course_lessons").getFullList({
      filter: `course="${courseId}"`,
      sort: "module,order",
    })
    const existingLessonsById = new Map<string, any>(
      existingLessons.map((l: any) => [l.id, l])
    )
    const existingLessonsByModule = existingLessons.reduce((map: Map<string, any[]>, l: any) => {
      map.set(l.module, [...(map.get(l.module) ?? []), l])
      return map
    }, new Map<string, any[]>())

    const incomingModuleIds = new Set(
      (modules ?? []).map((m) => m.id).filter(Boolean) as string[]
    )

    if (id) {
      for (const m of existingModules) {
        if (!incomingModuleIds.has(m.id)) {
          const lessonsToDelete = existingLessonsByModule.get(m.id) ?? []
          await Promise.all(lessonsToDelete.map((l: any) => pb.collection("course_lessons").delete(l.id)))
          await pb.collection("course_modules").delete(m.id)
        }
      }
    }

    for (let i = 0; i < modules.length; i++) {
      const m = modules[i]
      const modulePayload = {
        course: courseId,
        title: m.title || `Module ${i + 1}`,
        durationLabel: m.durationLabel ?? "",
        duration: m.durationLabel ?? "",
        order: m.order ?? i + 1,
        locked: !!m.locked,
      }

      let moduleId = m.id
      if (moduleId && existingModulesById.has(moduleId)) {
        await pb.collection("course_modules").update(moduleId, modulePayload)
      } else {
        const createdModule = await pb.collection("course_modules").create(modulePayload)
        moduleId = createdModule.id
      }

      const incomingLessons = m.lessons ?? []
      const incomingLessonIds = new Set(
        incomingLessons.map((l) => l.id).filter(Boolean) as string[]
      )

      if (id) {
        const existingForModule = existingLessonsByModule.get(moduleId!) ?? []
        for (const l of existingForModule) {
          if (!incomingLessonIds.has(l.id)) {
            await pb.collection("course_lessons").delete(l.id)
          }
        }
      }

      for (let j = 0; j < incomingLessons.length; j++) {
        const l = incomingLessons[j]
        const lessonAttachments = formData.getAll(`lessonAttachments-${i}-${j}`)
        const attachmentFiles = lessonAttachments.filter(
          (f): f is File => f instanceof File && f.size > 0
        )

        const lessonForm = new FormData()
        lessonForm.append("course", courseId)
        lessonForm.append("module", moduleId)
        lessonForm.append("title", l.title || `Lecon ${j + 1}`)
        lessonForm.append("durationLabel", l.durationLabel ?? "")
        lessonForm.append("duration", l.durationLabel ?? "")
        lessonForm.append("order", String(l.order ?? j + 1))
        lessonForm.append("locked", String(l.locked ?? false))
        lessonForm.append("attachmentsMeta", JSON.stringify(l.attachmentsMeta ?? []))
        lessonForm.append("youtubeLinks", JSON.stringify(l.youtubeLinks ?? []))
        for (const file of attachmentFiles) {
          lessonForm.append("attachments", file)
        }

        const hasAttachments = (rec: any) => {
          if (!rec) return false
          if (Array.isArray(rec.attachments)) return rec.attachments.length > 0
          return !!rec.attachments
        }

        const ensureAttachmentsSaved = async (rec: any, lessonId: string) => {
          if (attachmentFiles.length === 0) return rec
          if (hasAttachments(rec)) return rec

          // Retry for single-file fields
          const retryForm = new FormData()
          retryForm.append("course", courseId)
          retryForm.append("module", moduleId)
          retryForm.append("title", l.title || `Lecon ${j + 1}`)
          retryForm.append("durationLabel", l.durationLabel ?? "")
          retryForm.append("duration", l.durationLabel ?? "")
          retryForm.append("order", String(l.order ?? j + 1))
          retryForm.append("locked", String(l.locked ?? false))
          retryForm.append("attachmentsMeta", JSON.stringify(l.attachmentsMeta ?? []))
          retryForm.append("youtubeLinks", JSON.stringify(l.youtubeLinks ?? []))
          retryForm.append("attachments", attachmentFiles[0])
          const retryRec = await pb.collection("course_lessons").update(lessonId, retryForm)
          if (hasAttachments(retryRec)) return retryRec

          const keys = rec ? Object.keys(rec) : []
          const hasAttachmentsField = keys.includes("attachments")
          const hasMetaField = keys.includes("attachmentsMeta")
          const hasYoutubeField = keys.includes("youtubeLinks")
          console.error("Attachments not saved. Record keys:", keys)

          if (!hasAttachmentsField) {
            throw new Error(
              "PocketBase schema missing file field 'attachments' on collection 'course_lessons'. " +
              "Add a File field named 'attachments' (max files >= 1), then retry."
            )
          }
          if (!hasMetaField || !hasYoutubeField) {
            throw new Error(
              "PocketBase schema missing fields on 'course_lessons': " +
              `${!hasMetaField ? "attachmentsMeta " : ""}${!hasYoutubeField ? "youtubeLinks" : ""}`.trim() +
              ". Add JSON fields with those names, then retry."
            )
          }
          throw new Error(`Attachments failed to save for lesson ${lessonId}`)
        }

        if (l.id && existingLessonsById.has(l.id)) {
          const updated = await pb.collection("course_lessons").update(l.id, lessonForm)
          await ensureAttachmentsSaved(updated, l.id)
        } else {
          const created = await pb.collection("course_lessons").create(lessonForm)
          const lessonId = created?.id ?? "new"
          if (attachmentFiles.length > 0 && !hasAttachments(created)) {
            // Retry for newly created records too
            const retryForm = new FormData()
            retryForm.append("course", courseId)
            retryForm.append("module", moduleId)
            retryForm.append("title", l.title || `Lecon ${j + 1}`)
            retryForm.append("durationLabel", l.durationLabel ?? "")
            retryForm.append("duration", l.durationLabel ?? "")
            retryForm.append("order", String(l.order ?? j + 1))
            retryForm.append("locked", String(l.locked ?? false))
            retryForm.append("attachmentsMeta", JSON.stringify(l.attachmentsMeta ?? []))
            retryForm.append("youtubeLinks", JSON.stringify(l.youtubeLinks ?? []))
            retryForm.append("attachments", attachmentFiles[0])
            const retryRec = await pb.collection("course_lessons").update(created.id, retryForm)
            if (!hasAttachments(retryRec)) {
              const keys = created ? Object.keys(created) : []
              console.error("Attachments not saved on create. Record keys:", keys)
              throw new Error(`Attachments failed to save for new lesson ${lessonId}`)
            }
          }
        }
      }
    }
    const finalCourse = await pb.collection("courses").getOne(courseId)

    return NextResponse.json({
      ok: true,
      course: {
        ...finalCourse,
        coverImage: finalCourse.coverImage?.[0] ?? null,
      },
    })

  } catch (err: any) {
    console.error("ADMIN COURSES POST ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
