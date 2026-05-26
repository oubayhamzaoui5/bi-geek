import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

type GroupRecord = {
  id: string
  programType?: "course" | "bootcamp"
  course?: string | null
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

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

async function generateUniqueSlug(pb: PocketBase, title: string, currentId: string) {
  const baseSlug = slugify(title)
  let slug = baseSlug
  let counter = 1

  while (true) {
    try {
      const existing = await pb.collection("courses").getFirstListItem(`slug="${slug}"`)
      if (existing.id === currentId) return slug
      counter++
      slug = `${baseSlug}-${counter}`
    } catch {
      return slug
    }
  }
}

export async function GET(req: Request) {
  try {
    const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? process.env.POCKETBASE_URL
    if (!PB_URL) {
      return NextResponse.json({ courses: [] })
    }

    const { searchParams } = new URL(req.url)
    const studentId = (searchParams.get("studentId") || "").trim()

    const pb = await getPocketBase()
    if (!pb) {
      return NextResponse.json({ courses: [] })
    }

    let courseIds: Set<string> | null = null
    if (studentId) {
      const groups = await safeList<GroupRecord>(pb, "groups", { sort: "-created" })
      const related = groups.filter(
        (g) => g.programType === "course" && Array.isArray(g.students) && g.students.includes(studentId),
      )
      courseIds = new Set(related.map((g) => g.course).filter(Boolean) as string[])
      if (courseIds.size === 0) {
        return NextResponse.json({ courses: [] })
      }
    }

    const listOptions: Record<string, unknown> = { sort: "-created" }
    if (!studentId) {
      listOptions.filter = "isPublished = true"
    }

    const records = await pb.collection("courses").getFullList(listOptions)

    const filteredRecords = courseIds
      ? records.filter((c: any) => courseIds?.has(c.id))
      : records

    for (const course of filteredRecords as any[]) {
      if (!course.slug || course.slug.trim() === "") {
        try {
          const slug = await generateUniqueSlug(pb, course.title, course.id)
          await pb.collection("courses").update(course.id, { slug })
          course.slug = slug
        } catch {
          course.slug = ""
        }
      }
    }

    const courses = filteredRecords.map((c: any) => ({
      id: c.id,
      slug: c.slug || "",
      title: c.title,
      shortDescription: c.shortDescription,
      durationLabel: c.durationLabel,
      tags: Array.isArray(c.tags) ? c.tags : [],
      coverImage: c.coverImage
        ? `${PB_URL}/api/files/courses/${c.id}/${c.coverImage}`
        : null,
    }))

    return NextResponse.json({ courses })
  } catch (err) {
    console.error("COURSES API ERROR:", err)
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    )
  }
}
