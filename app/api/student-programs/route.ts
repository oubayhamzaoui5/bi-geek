import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

type GroupRecord = {
  id: string
  programType?: "course" | "bootcamp"
  course?: string | null
  bootcamp?: string | null
  students?: string[] | string | any
  status?: "not_started" | "in_progress" | "completed"
  unlockedLessons?: string[]
  unlockedModules?: string[]
}

const safeList = async <T>(
  pb: PocketBase,
  collection: string,
  options?: Record<string, unknown>,
): Promise<T[]> => {
  try {
    return (await pb.collection(collection).getFullList(options)) as T[]
  } catch {
    return []
  }
}

async function getPocketBase() {
  const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? process.env.POCKETBASE_URL
  if (!PB_URL) return null

  const pb = new PocketBase(PB_URL)
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD

  if (adminEmail && adminPassword) {
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword)
    } catch {
      // Ignore admin auth failure; fall back to public access
    }
  }

  return pb
}

export async function GET(req: Request) {
  const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? process.env.POCKETBASE_URL
  if (!PB_URL) {
    return NextResponse.json({ programs: [] })
  }

  const { searchParams } = new URL(req.url)
  const studentId = (searchParams.get("studentId") || "").trim()

  if (!studentId) {
    return NextResponse.json({ programs: [] })
  }

  try {
    const pb = await getPocketBase()
    if (!pb) return NextResponse.json({ programs: [] })

    const groups = await safeList<GroupRecord>(pb, "groups")
    const relatedGroups = groups.filter((g) => {
      // Filter out 'pas encore' per the user's request
      if (g.status === "not_started") return false

      let studentArray: string[] = []
      if (Array.isArray(g.students)) studentArray = g.students
      else if (typeof g.students === "string") {
        try {
          studentArray = JSON.parse(g.students)
        } catch {
          studentArray = g.students.split(",").map((s) => s.trim())
        }
      }
      return studentArray.includes(studentId)
    })

    const groupStatusMap = new Map<string, string>()
    relatedGroups.forEach((g) => {
      if (g.course) groupStatusMap.set(g.course, g.status || "in_progress")
      if (g.bootcamp) groupStatusMap.set(g.bootcamp, g.status || "in_progress")
    })

    const courseIds = new Set(
      relatedGroups
        .filter((g) => g.course) // Allow even if programType is missing
        .map((g) => g.course as string),
    )
    const bootcampIds = new Set(
      relatedGroups
        .filter((g) => g.bootcamp)
        .map((g) => g.bootcamp as string),
    )

    if (courseIds.size === 0 && bootcampIds.size === 0) {
      return NextResponse.json({ programs: [] })
    }

    const [courseRecords, bootcampRecords, allLessons] = await Promise.all([
      safeList<any>(pb, "courses"),
      safeList<any>(pb, "bootcamps"),
      courseIds.size > 0
        ? safeList<any>(pb, "course_lessons", { fields: "id,course" })
        : Promise.resolve([]),
    ])

    // Build a map: courseId → total lesson count
    const lessonCountByCourse = new Map<string, number>()
    for (const lesson of allLessons) {
      if (lesson.course) {
        lessonCountByCourse.set(lesson.course, (lessonCountByCourse.get(lesson.course) ?? 0) + 1)
      }
    }

    // Build a map: courseId → group (to access unlocked lessons)
    const groupByCourse = new Map<string, GroupRecord>()
    for (const g of relatedGroups) {
      if (g.course) groupByCourse.set(g.course, g)
    }

    const courses = courseRecords
      .filter((c) => courseIds.has(c.id))
      .map((c: any) => {
        const group = groupByCourse.get(c.id)
        const totalLessons = lessonCountByCourse.get(c.id) ?? 0
        const unlockedLessons = Array.isArray(group?.unlockedLessons) ? group.unlockedLessons.length : 0
        const isCompleted = groupStatusMap.get(c.id) === "completed"
        const progress = isCompleted ? 100 : totalLessons > 0 ? Math.round((unlockedLessons / totalLessons) * 100) : 0
        return {
          id: c.id,
          slug: c.slug ?? c.id,
          title: c.title,
          shortDescription: c.shortDescription,
          durationLabel: c.durationLabel,
          tags: Array.isArray(c.tags) ? c.tags : [],
          coverImage: c.coverImage
            ? `${PB_URL}/api/files/courses/${c.id}/${c.coverImage}`
            : null,
          programType: "course" as const,
          status: groupStatusMap.get(c.id) || "in_progress",
          completed: isCompleted,
          progress,
        }
      })

    const bootcamps = bootcampRecords
      .filter((b) => bootcampIds.has(b.id))
      .map((b: any) => ({
        id: b.id,
        slug: b.slug ?? b.id,
        title: b.title,
        shortDescription: b.shortDescription ?? "",
        durationLabel: b.durationLabel ?? "",
        tags: ["Bootcamp"],
        coverImage: b.coverImage
          ? `${PB_URL}/api/files/bootcamps/${b.id}/${b.coverImage}`
          : null,
        programType: "bootcamp" as const,
        status: groupStatusMap.get(b.id) || "in_progress",
        completed: groupStatusMap.get(b.id) === "completed"
      }))

    const programs = [...courses, ...bootcamps].sort((a, b) =>
      (a.title ?? "").localeCompare(b.title ?? ""),
    )

    return NextResponse.json({ programs })
  } catch (err) {
    console.error("STUDENT PROGRAMS API ERROR:", err)
    return NextResponse.json({ programs: [] })
  }
}
