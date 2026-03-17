import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

type GroupRecord = {
  id: string
  programType?: "course" | "bootcamp"
  course?: string | null
  bootcamp?: string | null
  students?: string[]
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

    const groups = await safeList<GroupRecord>(pb, "groups", { sort: "-created" })
    const relatedGroups = groups.filter((g) =>
      Array.isArray(g.students) && g.students.includes(studentId),
    )

    const courseIds = new Set(
      relatedGroups
        .filter((g) => g.programType === "course" && g.course)
        .map((g) => g.course as string),
    )
    const bootcampIds = new Set(
      relatedGroups
        .filter((g) => g.programType === "bootcamp" && g.bootcamp)
        .map((g) => g.bootcamp as string),
    )

    if (courseIds.size === 0 && bootcampIds.size === 0) {
      return NextResponse.json({ programs: [] })
    }

    const [courseRecords, bootcampRecords] = await Promise.all([
      safeList<any>(pb, "courses", { sort: "-created" }),
      safeList<any>(pb, "bootcamps", { sort: "-created" }),
    ])

    const courses = courseRecords
      .filter((c) => courseIds.has(c.id))
      .map((c: any) => ({
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
      }))

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
