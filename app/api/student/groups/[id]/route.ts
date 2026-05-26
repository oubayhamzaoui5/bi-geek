import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { authErrorResponse, requireUser } from "@/lib/server-auth"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!,
  )
  return pb
}

function canReadGroup(user: { id: string; role: string }, studentIds: string[]) {
  return user.role === "admin" || user.role === "admin_agent" || studentIds.includes(user.id)
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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    const pb = await getAdminPb()
    const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

    const group = await pb.collection("groups").getOne(id, { expand: "instructor" })
    const studentIds: string[] = Array.isArray(group.students) ? group.students : []
    if (!canReadGroup(user, studentIds)) {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 })
    }

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
          coverImage: course.coverImage ? `${PB_FILE_URL}/api/files/courses/${course.id}/${course.coverImage}` : null,
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
          coverImage: bootcamp.coverImage ? `${PB_FILE_URL}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}` : null,
        }
      } catch {}
    }

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
    const instructorIds = groupInstructorIds(group)
    const expanded = group.expand?.instructor
    const expandedList = Array.isArray(expanded) ? expanded : expanded ? [expanded] : []
    const expandedMap = new Map(expandedList.map((i: any) => [i.id, i]))
    const instructors = instructorIds
      .map(instructorId => expandedMap.get(instructorId))
      .filter(Boolean)
      .map((i: any) => ({ id: i.id, name: i.name || "", surname: i.surname || "", avatar: resolveAvatar(i, PB_FILE_URL) }))

    return NextResponse.json({
      ok: true,
      group: {
        id: group.id,
        title: group.title || "",
        status: group.status || "not_started",
        programType,
        courseId,
        bootcampId,
        instructorIds,
        instructorId: instructorIds[0] || null,
        instructors,
        instructor: instructors[0] ?? null,
        studentIds,
        students,
        program,
        created: group.created,
      },
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("STUDENT GROUP GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
