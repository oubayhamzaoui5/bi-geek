// app/api/admin/courses/route.ts
import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

type IncomingLesson = {
  id?: string
  title: string
  durationLabel?: string
  order?: number
}

type IncomingModule = {
  id?: string
  title: string
  durationLabel?: string
  order?: number
  lessons?: IncomingLesson[]
}

type IncomingCourse = {
  id?: string
  title: string
  shortDescription: string
  longDescription?: string
  durationLabel: string
  levelLabel: string
  certificate?: boolean
  rating?: number
  reviewsCount?: number
  whatYouWillLearn?: string[]
  tags?: string[]
  modules?: IncomingModule[]
}

async function getAdminPb() {
  const PB_URL = process.env.POCKETBASE_URL
  const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
  const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

  if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Variables d'environnement PocketBase manquantes.")
  }

  const pb = new PocketBase(PB_URL)
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  return pb
}

export async function GET() {
  try {
    const pb = await getAdminPb()

    const [courseRecords, moduleRecords, lessonRecords] = await Promise.all([
      pb.collection("courses").getFullList({ sort: "title" }),
      pb.collection("course_modules").getFullList({ sort: "course,order" }),
      pb.collection("course_lessons").getFullList({ sort: "course,order" }),
    ])

    // group modules by courseId
    const modulesByCourse = new Map<string, any[]>()
    for (const m of moduleRecords as any[]) {
      const arr = modulesByCourse.get(m.course) ?? []
      arr.push(m)
      modulesByCourse.set(m.course, arr)
    }

    // group lessons by moduleId
    const lessonsByModule = new Map<string, any[]>()
    for (const l of lessonRecords as any[]) {
      const arr = lessonsByModule.get(l.module) ?? []
      arr.push(l)
      lessonsByModule.set(l.module, arr)
    }

    const courses = (courseRecords as any[]).map((c) => {
      const mods = modulesByCourse.get(c.id) ?? []
      const modules = mods.map((m: any) => {
        const ls = lessonsByModule.get(m.id) ?? []
        return {
          id: m.id,
          title: m.title,
          durationLabel: m.durationLabel ?? m.duration ?? "",
          order: m.order ?? 0,
          lessons: ls.map((l: any) => ({
            id: l.id,
            title: l.title,
            durationLabel: l.durationLabel ?? l.duration ?? "",
            order: l.order ?? 0,
          })),
        }
      })

      return {
        id: c.id,
        title: c.title,
        shortDescription: c.shortDescription,
        longDescription: c.longDescription,
        durationLabel: c.durationLabel,
        levelLabel: c.levelLabel,
        certificate: !!c.certificate,
        rating: c.rating ?? 4.8,
        reviewsCount: c.reviewsCount ?? 0,
        whatYouWillLearn: c.whatYouWillLearn ?? [],
        tags: c.tags ?? [],
        modules,
      }
    })

    return NextResponse.json({ ok: true, courses })
  } catch (err: any) {
    console.error("ADMIN COURSES GET ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as IncomingCourse
    const {
      id,
      title,
      shortDescription,
      longDescription,
      durationLabel,
      levelLabel,
      certificate,
      rating,
      reviewsCount,
      whatYouWillLearn,
      tags,
      modules,
    } = body

    if (!title || !shortDescription || !durationLabel || !levelLabel) {
      return NextResponse.json(
        {
          error:
            "title, shortDescription, durationLabel, levelLabel sont requis pour le cours.",
        },
        { status: 400 },
      )
    }

    const pb = await getAdminPb()

    // create or update course
    let courseRecord: any
    const payload = {
      title,
      shortDescription,
      longDescription: longDescription || shortDescription,
      durationLabel,
      levelLabel,
      certificate: certificate ?? true,
      rating: rating ?? 4.8,
      reviewsCount: reviewsCount ?? 0,
      whatYouWillLearn: whatYouWillLearn ?? [],
      tags: tags ?? [],
      isPublished: true,
    }

    if (id) {
      courseRecord = await pb.collection("courses").update(id, payload)
    } else {
      courseRecord = await pb.collection("courses").create(payload)
    }

    const courseId = courseRecord.id

    // ---------- Sync modules + lessons ----------
    const incomingModules = modules ?? []

    // 1) delete existing modules + lessons for this course
    const existingModules = await pb.collection("course_modules").getFullList({
      filter: `course="${courseId}"`,
    })

    const moduleIds = (existingModules as any[]).map((m) => m.id)
    if (moduleIds.length > 0) {
      const filterLessons = moduleIds.map((mid) => `module="${mid}"`).join(" || ")
      const existingLessons = await pb.collection("course_lessons").getFullList({
        filter: filterLessons,
      })

      for (const l of existingLessons as any[]) {
        await pb.collection("course_lessons").delete(l.id)
      }

      for (const m of existingModules as any[]) {
        await pb.collection("course_modules").delete(m.id)
      }
    }

    // 2) recreate modules + lessons (respect incoming order if provided)
    for (let i = 0; i < incomingModules.length; i++) {
      const m = incomingModules[i]
      const moduleOrder = typeof m.order === "number" ? m.order : i + 1

      const createdModule = await pb.collection("course_modules").create({
        course: courseId,
        title: m.title || `Module ${i + 1}`,
        durationLabel: m.durationLabel ?? "",
        duration: m.durationLabel ?? "",
        order: moduleOrder,
      })

      const lessons = m.lessons ?? []
      for (let j = 0; j < lessons.length; j++) {
        const l = lessons[j]
        const lessonOrder = typeof l.order === "number" ? l.order : j + 1

        await pb.collection("course_lessons").create({
          course: courseId,
          module: createdModule.id,
          title: l.title || `Leçon ${j + 1}`,
          durationLabel: l.durationLabel ?? "",
          duration: l.durationLabel ?? "",
          order: lessonOrder,
        })
      }
    }

    // 3) rebuild the course with modules/lessons for response
    const moduleRecords = await pb.collection("course_modules").getFullList({
      filter: `course="${courseId}"`,
      sort: "order",
    })

    const lessonRecords = await pb.collection("course_lessons").getFullList({
      filter: `course="${courseId}"`,
      sort: "order",
    })

    const lessonsByModule = new Map<string, any[]>()
    for (const l of lessonRecords as any[]) {
      const arr = lessonsByModule.get(l.module) ?? []
      arr.push(l)
      lessonsByModule.set(l.module, arr)
    }

    const modulesForResponse = (moduleRecords as any[]).map((m) => {
      const ls = lessonsByModule.get(m.id) ?? []
      return {
        id: m.id,
        title: m.title,
        durationLabel: m.durationLabel ?? m.duration ?? "",
        order: m.order ?? 0,
        lessons: ls.map((l: any) => ({
          id: l.id,
          title: l.title,
          durationLabel: l.durationLabel ?? l.duration ?? "",
          order: l.order ?? 0,
        })),
      }
    })

    const course = {
      id: courseRecord.id,
      title: courseRecord.title,
      shortDescription: courseRecord.shortDescription,
      longDescription: courseRecord.longDescription,
      durationLabel: courseRecord.durationLabel,
      levelLabel: courseRecord.levelLabel,
      certificate: !!courseRecord.certificate,
      rating: courseRecord.rating ?? 4.8,
      reviewsCount: courseRecord.reviewsCount ?? 0,
      whatYouWillLearn: courseRecord.whatYouWillLearn ?? [],
      tags: courseRecord.tags ?? [],
      modules: modulesForResponse,
    }

    return NextResponse.json({ ok: true, course })
  } catch (err: any) {
    console.error("ADMIN COURSES POST ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
