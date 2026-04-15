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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const instructorId = searchParams.get("instructorId")
    if (!instructorId) return NextResponse.json({ error: "instructorId requis" }, { status: 400 })

    const pb = await getAdminPb()

    // Robust fetch — tries multiple filter strategies then falls back to in-memory filter
    const fetchGroups = async () => {
      // Strategy 1: exact match with sort
      try {
        const res = await pb.collection("groups").getFullList({
          filter: `instructor = "${instructorId}"`,
          sort: "-created",
          expand: "instructor",
        })
        if (res.length > 0) return res
      } catch (e1) {
        console.warn("INSTRUCTOR GROUPS: strategy 1 failed", e1)
      }

      // Strategy 2: contains match (for PocketBase versions that store single-relation as array)
      try {
        const res = await pb.collection("groups").getFullList({
          filter: `instructor ~ "${instructorId}"`,
          sort: "-created",
          expand: "instructor",
        })
        if (res.length > 0) return res
      } catch (e2) {
        console.warn("INSTRUCTOR GROUPS: strategy 2 failed", e2)
      }

      // Strategy 3: fetch all and filter in memory (handles both string and array storage)
      try {
        const all = await pb.collection("groups").getFullList({ expand: "instructor" })
        return all.filter((g: any) => {
          if (!g.instructor) return false
          if (Array.isArray(g.instructor)) return g.instructor.includes(instructorId)
          return g.instructor === instructorId
        })
      } catch (e3) {
        console.error("INSTRUCTOR GROUPS: all strategies failed", e3)
        return []
      }
    }

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
            avatar: s.avatar
              ? `${process.env.POCKETBASE_URL}/api/files/${s.collectionId}/${s.id}/${s.avatar}`
              : null,
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
        instructorId: g.instructor || null,
        instructor: g.expand?.instructor
          ? {
              id: g.expand.instructor.id,
              name: g.expand.instructor.name || "",
              surname: g.expand.instructor.surname || "",
            }
          : null,
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

    return NextResponse.json({ ok: true, groups: formatted, courses, bootcamps })
  } catch (err: any) {
    console.error("INSTRUCTOR GROUPS GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
