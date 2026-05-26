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

function resolveAvatar(user: any) {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  const pbUrl = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const instructorId = searchParams.get("instructorId")
    if (!instructorId) return NextResponse.json({ error: "instructorId requis" }, { status: 400 })

    const pb = await getAdminPb()

    // Robust fetch — tries multiple filter strategies then falls back to in-memory filter
    const fetchGroups = async () => {
      const byId = new Map<string, any>()

      try {
        const res = await pb.collection("groups").getFullList({
          filter: `instructor = "${instructorId}"`,
          expand: "instructor",
        })
        res.forEach((g: any) => byId.set(g.id, g))
      } catch (e1) {
        console.warn("INSTRUCTOR GROUPS: strategy 1 failed", e1)
      }

      try {
        const res = await pb.collection("groups").getFullList({
          filter: `instructor ~ "${instructorId}"`,
          expand: "instructor",
        })
        res.forEach((g: any) => byId.set(g.id, g))
      } catch (e2) {
        console.warn("INSTRUCTOR GROUPS: strategy 2 failed", e2)
      }

      try {
        const all = await pb.collection("groups").getFullList({ expand: "instructor" })
        all
          .filter((g: any) => groupInstructorIds(g).includes(instructorId))
          .forEach((g: any) => byId.set(g.id, g))
        return Array.from(byId.values())
      } catch (e3) {
        console.warn("INSTRUCTOR GROUPS: fallback failed", e3)
        return Array.from(byId.values())
      }
    }

    const today = new Date().toISOString().slice(0, 10)

    const [groupRes, courseRes, bootcampRes] = await Promise.allSettled([
      fetchGroups(),
      pb.collection("courses").getFullList({ sort: "title" }),
      pb.collection("bootcamps").getFullList({ sort: "title" }),
    ])

    const groups = groupRes.status === "fulfilled" ? groupRes.value : []

    if (groupRes.status === "rejected") {
      console.error("INSTRUCTOR GROUPS: all fetch strategies failed", groupRes.reason)
    }

    const courses = courseRes.status === "fulfilled"
      ? courseRes.value.map((c: any) => ({
          id: c.id,
          title: c.title || "",
          shortDescription: c.shortDescription || "",
          longDescription: c.longDescription || "",
          coverImage: c.coverImage || null,
        }))
      : []
    const courseMap: Record<string, string> = {}
    if (courseRes.status === "fulfilled") {
      courseRes.value.forEach((c: any) => { courseMap[c.id] = c.title })
    }
    const bootcamps = bootcampRes.status === "fulfilled"
      ? bootcampRes.value.map((b: any) => ({
          id: b.id,
          title: b.title || "",
          shortDescription: b.shortDescription || "",
          longDescription: b.longDescription || "",
          coverImage: b.coverImage || null,
        }))
      : []
    const bootcampMap: Record<string, string> = {}
    if (bootcampRes.status === "fulfilled") {
      bootcampRes.value.forEach((b: any) => { bootcampMap[b.id] = b.title })
    }

    // Collect all student IDs
    const studentIdSet = new Set<string>()
    for (const g of groups) {
      const ids: string[] = Array.isArray(g.students) ? g.students : []
      ids.forEach(id => studentIdSet.add(id))
    }

    let studentsMap: Record<string, any> = {}
    if (studentIdSet.size > 0) {
      const studentIds = Array.from(studentIdSet)
      const filter = studentIds.map(id => `id = "${id}"`).join(" || ")
      try {
        const students = await pb.collection("users").getFullList({ filter })
        students.forEach((s: any) => {
          studentsMap[s.id] = {
            id: s.id,
            username: s.username || s.name || s.email?.split("@")[0] || "",
            email: s.email || "",
            avatar: resolveAvatar(s),
          }
        })
      } catch (e) {
        console.warn("INSTRUCTOR GROUPS: students fetch failed", e)
      }
    }

    const formatted = (groups as any[]).map((g: any) => {
      // Normalize schedules (can be JSON string or array)
      const schedules = (() => {
        const raw = g.schedules
        if (!raw) return []
        if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return [] } }
        if (Array.isArray(raw)) return raw
        return []
      })()

      return {
        id: g.id,
        title: g.title,
        status: g.status,
        programType: g.programType || (g.course ? "course" : "bootcamp"),
        courseId: g.course || "",
        bootcampId: g.bootcamp || "",
        studentIds: Array.isArray(g.students) ? g.students : [],
        instructorIds: groupInstructorIds(g),
        instructorId: groupInstructorIds(g)[0] || null,
        instructors: (() => {
          const expanded = g.expand?.instructor
          const expandedList = Array.isArray(expanded) ? expanded : expanded ? [expanded] : []
          const map = new Map(expandedList.map((i: any) => [i.id, i]))
          return groupInstructorIds(g)
            .map(id => map.get(id))
            .filter(Boolean)
            .map((i: any) => ({ id: i.id, name: i.name || "", surname: i.surname || "", avatar: resolveAvatar(i) }))
        })(),
        instructor: (() => {
          const expanded = g.expand?.instructor
          const first = Array.isArray(expanded) ? expanded[0] : expanded
          return first ? { id: first.id, name: first.name || "", surname: first.surname || "", avatar: resolveAvatar(first) } : null
        })(),
        courseTitle: g.course ? (courseMap[g.course] || "") : "",
        bootcampTitle: g.bootcamp ? (bootcampMap[g.bootcamp] || "") : "",
        students: (Array.isArray(g.students) ? g.students : [])
          .map((id: string) => studentsMap[id])
          .filter(Boolean),
        schedules,
        schedule_start_date: g.schedule_start_date ? g.schedule_start_date.slice(0, 10) : null,
        schedule_end_date: g.schedule_end_date ? g.schedule_end_date.slice(0, 10) : null,
        created: g.created,
      }
    })

    // Fetch upcoming sessions for in_progress groups
    const inProgressIds = formatted.filter(g => g.status === "in_progress").map(g => g.id)
    let sessions: any[] = []
    if (inProgressIds.length > 0) {
      const groupFilter = inProgressIds.map(id => `group = "${id}"`).join(" || ")
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

    // Pre-sort in_progress groups by next upcoming session.
    // A session becomes past only after its derived end time.
    const now = Date.now()
    const nextTimeByGroup = new Map<string, number>()
    for (const s of sessions) {
      if (s.is_cancelled) continue
      const t = new Date(`${s.date}T${s.start_time || "00:00"}:00`).getTime()
      const end = t + Math.max(s.duration || 120, 1) * 60_000
      if (!Number.isFinite(t) || end < now) continue
      const existing = nextTimeByGroup.get(s.group)
      if (existing === undefined || t < existing) nextTimeByGroup.set(s.group, t)
    }
    formatted.sort((a, b) => {
      if (a.status !== "in_progress" || b.status !== "in_progress") return 0
      const ta = nextTimeByGroup.get(a.id) ?? Infinity
      const tb = nextTimeByGroup.get(b.id) ?? Infinity
      return ta - tb
    })

    return NextResponse.json({ ok: true, groups: formatted, courses, bootcamps, sessions })
  } catch (err: any) {
    console.error("INSTRUCTOR GROUPS GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
