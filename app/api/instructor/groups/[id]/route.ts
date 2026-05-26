import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

function resolveAvatar(user: any, pbUrl: string) {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  return `${pbUrl}/api/files/${user.collectionId}/${user.id}/${user.avatar}`
}

function normalizeIds(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [String(value)] : []
}

function groupInstructorIds(group: any): string[] {
  const ids = normalizeIds(group?.instructor)
  return group?.programType === "bootcamp" ? ids : ids.slice(0, 1)
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pb = await getAdminPb()
    const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

    const group = await pb.collection("groups").getOne(id, { expand: "instructor" })

    const programType = group.programType || (group.course ? "course" : group.bootcamp ? "bootcamp" : "course")
    const courseId = group.course || ""
    const bootcampId = group.bootcamp || ""

    let program: any = null

    if (programType === "course" && courseId) {
      try {
        const course = await pb.collection("courses").getOne(courseId)
        program = {
          id: course.id,
          type: "course",
          title: course.title || "",
          shortDescription: course.shortDescription || "",
          longDescription: course.longDescription || "",
          coverImage: course.coverImage
            ? `${PB_FILE_URL}/api/files/courses/${course.id}/${course.coverImage}`
            : null,
        }
      } catch {}
    } else if (programType === "bootcamp" && bootcampId) {
      try {
        const bootcamp = await pb.collection("bootcamps").getOne(bootcampId)
        program = {
          id: bootcamp.id,
          type: "bootcamp",
          title: bootcamp.title || "",
          shortDescription: bootcamp.shortDescription || "",
          longDescription: bootcamp.longDescription || "",
          coverImage: bootcamp.coverImage
            ? `${PB_FILE_URL}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}`
            : null,
        }
      } catch {}
    }

    const studentIds: string[] = Array.isArray(group.students) ? group.students : []
    let students: any[] = []
    if (studentIds.length > 0) {
      try {
        const filter = studentIds.map((sid: string) => `id = "${sid}"`).join(" || ")
        const usersRes = await pb.collection("users").getFullList({ filter })
        students = usersRes.map((u: any) => ({
          id: u.id,
          name: u.name || "",
          surname: u.surname || "",
          username: u.username || "",
          email: u.email || "",
          avatar: resolveAvatar(u, PB_FILE_URL),
        }))
      } catch {}
    }
    return NextResponse.json({
      ok: true,
      group: {
        id: group.id,
        title: group.title || "",
        status: group.status || "not_started",
        programType,
        courseId,
        bootcampId,
        instructorIds: groupInstructorIds(group),
        instructorId: groupInstructorIds(group)[0] || null,
        instructors: (() => {
          const expanded = group.expand?.instructor
          const expandedList = Array.isArray(expanded) ? expanded : expanded ? [expanded] : []
          const map = new Map(expandedList.map((i: any) => [i.id, i]))
          return groupInstructorIds(group)
            .map(id => map.get(id))
            .filter(Boolean)
            .map((i: any) => ({ id: i.id, name: i.name || "", surname: i.surname || "", avatar: resolveAvatar(i, PB_FILE_URL) }))
        })(),
        instructor: (() => {
          const expanded = group.expand?.instructor
          const first = Array.isArray(expanded) ? expanded[0] : expanded
          return first ? { id: first.id, name: first.name || "", surname: first.surname || "", avatar: resolveAvatar(first, PB_FILE_URL) } : null
        })(),
        studentIds,
        students,
        program,
        created: group.created,
      },
    })
  } catch (err: any) {
    console.error("INSTRUCTOR GROUP GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
