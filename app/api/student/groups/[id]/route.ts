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

function sessionStartMs(session: any) {
  const date = session.date?.slice(0, 10) || "1970-01-01"
  const time = session.start_time || "00:00"
  return new Date(`${date}T${time}:00`).getTime()
}

function formatSession(s: any) {
  return {
    id: s.id,
    title: s.title || null,
    date: s.date.slice(0, 10),
    start_time: s.start_time || "",
    mode: s.mode || "live_presentiel",
    joinUrl: s.joinUrl || null,
    recordingUrl: s.recordingUrl || null,
    googleEventId: s.googleEventId || null,
    is_ended: s.is_ended || false,
    ended_at: s.ended_at || null,
  }
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

    const now = new Date()
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const nowMs = now.getTime()

    let nextSession = null
    let nextSessions: any[] = []
    let todaySession: any = null
    let pastSessions: any[] = []
    try {
      const sessionsRes = await pb.collection("sessions").getFullList({
        filter: `group = "${id}" && (mode = "live" || mode = "live_presentiel")`,
        sort: "date,start_time",
      })
      const active = sessionsRes.filter((s: any) => !s.is_cancelled && !s.is_ended)
      nextSessions = active
        .filter((s: any) => sessionStartMs(s) >= nowMs)
        .slice(0, 3)
        .map(formatSession)
      nextSession = nextSessions[0] ?? null
      const todayStarted = active
        .filter((s: any) => s.date?.slice(0, 10) === todayYMD && sessionStartMs(s) < nowMs)
        .sort((a: any, b: any) => sessionStartMs(b) - sessionStartMs(a))[0]
      todaySession = todayStarted ? formatSession(todayStarted) : null
      pastSessions = sessionsRes
        .filter((s: any) => !!s.is_ended || sessionStartMs(s) < nowMs)
        .sort((a: any, b: any) => sessionStartMs(b) - sessionStartMs(a))
        .map(formatSession)
    } catch {}

    return NextResponse.json({
      ok: true,
      group: {
        id: group.id,
        title: group.title || "",
        status: group.status || "not_started",
        programType,
        courseId,
        bootcampId,
        instructorId: group.instructor || null,
        instructor: group.expand?.instructor
          ? {
              id: group.expand.instructor.id,
              name: group.expand.instructor.name || "",
              surname: group.expand.instructor.surname || "",
              avatar: resolveAvatar(group.expand.instructor, PB_FILE_URL),
            }
          : null,
        studentIds,
        students,
        program,
        created: group.created,
      },
      nextSession,
      nextSessions,
      todaySession,
      pastSessions,
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("STUDENT GROUP GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
