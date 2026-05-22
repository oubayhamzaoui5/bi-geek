import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { assertSelfOrRole, authErrorResponse, requireUser } from "@/lib/server-auth"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!,
  )
  return pb
}

function resolveAvatar(user: any) {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  const pbUrl = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL
  return `${pbUrl}/api/files/${user.collectionId}/${user.id}/${user.avatar}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    if (!studentId) return NextResponse.json({ error: "studentId requis" }, { status: 400 })
    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    assertSelfOrRole(user, studentId)

    const pb = await getAdminPb()

    // Robust fetch — tries multiple filter strategies then falls back to in-memory filter
    const fetchGroups = async () => {
      // Strategy 1: contains match (standard for multi-select field)
      try {
        const res = await pb.collection("groups").getFullList({
          filter: `students ~ "${studentId}"`,
          expand: "instructor",
        })
        if (res.length > 0) return res
      } catch (e1) {
        console.warn("STUDENT GROUPS: strategy 1 failed", e1)
      }

      // Strategy 2: fetch all and filter in memory (handles edge cases)
      try {
        const all = await pb.collection("groups").getFullList({ expand: "instructor" })
        return all.filter((g: any) => {
          if (!g.students) return false
          if (Array.isArray(g.students)) return g.students.includes(studentId)
          return g.students === studentId
        })
      } catch (e2) {
        console.error("STUDENT GROUPS: all strategies failed", e2)
        return []
      }
    }

    const today = new Date().toISOString().slice(0, 10)

    const [groupsRes, coursesRes, bootcampsRes] = await Promise.allSettled([
      fetchGroups(),
      pb.collection("courses").getFullList({ sort: "title" }),
      pb.collection("bootcamps").getFullList({ sort: "title" }),
    ])

    const groups = groupsRes.status === "fulfilled" ? groupsRes.value : []
    const courses = coursesRes.status === "fulfilled"
      ? coursesRes.value.map((c: any) => ({
          id: c.id,
          title: c.title || "",
          shortDescription: c.shortDescription || "",
          longDescription: c.longDescription || "",
          coverImage: c.coverImage || null,
        }))
      : []
    const bootcamps = bootcampsRes.status === "fulfilled"
      ? bootcampsRes.value.map((b: any) => ({
          id: b.id,
          title: b.title || "",
          shortDescription: b.shortDescription || "",
          longDescription: b.longDescription || "",
          coverImage: b.coverImage || null,
        }))
      : []

    const formatted = (groups as any[]).map((g: any) => ({
      id: g.id,
      title: g.title,
      status: g.status,
      programType: g.programType || (g.course ? "course" : "bootcamp"),
      courseId: g.course || "",
      bootcampId: g.bootcamp || "",
      studentIds: Array.isArray(g.students) ? g.students : [],
      instructorId: g.instructor || null,
      schedules: Array.isArray(g.schedules) ? g.schedules : [],
      schedule_start_date: g.schedule_start_date || null,
      schedule_end_date: g.schedule_end_date || null,
      instructor: g.expand?.instructor
        ? {
            id: g.expand.instructor.id,
            name: g.expand.instructor.name || "",
            surname: g.expand.instructor.surname || "",
            avatar: resolveAvatar(g.expand.instructor),
          }
        : null,
    }))

    // Fetch upcoming sessions so groups can be ordered by their nearest next seance
    const groupIds = formatted.map(g => g.id)
    let sessions: any[] = []
    if (groupIds.length > 0) {
      const groupFilter = groupIds.map(id => `group = "${id}"`).join(" || ")
      sessions = await pb.collection("sessions").getFullList({
        filter: `(${groupFilter}) && date >= "${today}"`,
        sort: "date,start_time",
      }).then(recs => recs.map((s: any) => ({
        id: s.id,
        group: s.group,
        date: s.date.slice(0, 10),
        start_time: s.start_time || "",
        duration: s.duration || 120,
        mode: s.mode || "live_presentiel",
        title: s.title || null,
        is_cancelled: s.is_cancelled || false,
      }))).catch(() => [])
    }

    // Pre-sort groups by next upcoming session; groups without future sessions stay at the end.
    const now = Date.now()
    const nextTimeByGroup = new Map<string, number>()
    for (const s of sessions) {
      if (s.is_cancelled) continue
      const t = new Date(`${s.date}T${s.start_time || "00:00"}:00`).getTime()
      if (!Number.isFinite(t) || t < now) continue
      const existing = nextTimeByGroup.get(s.group)
      if (existing === undefined || t < existing) nextTimeByGroup.set(s.group, t)
    }
    formatted.sort((a, b) => {
      const ta = nextTimeByGroup.get(a.id) ?? Infinity
      const tb = nextTimeByGroup.get(b.id) ?? Infinity
      if (ta !== tb) return ta - tb
      return a.title.localeCompare(b.title)
    })

    return NextResponse.json({ ok: true, groups: formatted, courses, bootcamps, sessions })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("STUDENT GROUPS GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
