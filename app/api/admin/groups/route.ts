import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { authErrorResponse, requireUser } from "@/lib/server-auth"

type ScheduleSlot = {
  day: string
  start_time: string
  duration: number
  start_date?: string
  end_date?: string
}

type IncomingGroup = {
  id?: string
  title: string
  status: "not_started" | "in_progress" | "completed"
  programType: "course" | "bootcamp"
  courseId?: string | null
  bootcampId?: string | null
  instructorId?: string | null
  instructorIds?: string[]
  studentIds?: string[]
  lockedModules?: string[]
  unlockedModules?: string[]
  lockedLessons?: string[]
  unlockedLessons?: string[]
  resourceMode?: "default" | "custom"
  schedules?: ScheduleSlot[]
  schedule_start_date?: string | null
  schedule_end_date?: string | null
}

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL || "http://127.0.0.1:8090"

function resolveAvatar(user: any): string | null {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  const collection = user.collectionId || user.collectionName || "users"
  return `${PB_FILE_URL}/api/files/${collection}/${user.id}/${user.avatar}`
}

function normalizeIds(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [String(value)] : []
}

function groupInstructorIds(record: any): string[] {
  const ids = normalizeIds(record?.instructor)
  return record?.programType === "bootcamp" ? ids : ids.slice(0, 1)
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))]
}

function pocketbaseOrFilter(field: string, ids: string[]) {
  return uniqueIds(ids).map(id => `${field}="${id.replace(/"/g, '\\"')}"`).join(" || ")
}

async function getUsersByRole(pb: PocketBase, role: string, options: { fields?: string; sort?: string } = {}) {
  const sort = options.sort || "name"
  const fields = options.fields
  const filteredOptions = fields
    ? { filter: `role = "${role}"`, fields, sort }
    : { filter: `role = "${role}"`, sort }

  try {
    const records = await pb.collection("users").getFullList(filteredOptions)
    if (records.length > 0) return records
  } catch (err) {
    console.error(`ADMIN GROUPS GET WARN: users role filter failed for ${role}`, err)
  }

  const fallbackOptions = fields
    ? { fields: `${fields},role`, sort }
    : { sort }
  const records = await pb.collection("users").getFullList(fallbackOptions)
  return records.filter((u: any) => u.role === role)
}

async function getAssignedUsersById(pb: PocketBase, ids: string[]) {
  const unique = uniqueIds(ids)
  if (unique.length === 0) return []

  try {
    return await pb.collection("users").getFullList({
      filter: pocketbaseOrFilter("id", unique),
      sort: "name",
    })
  } catch (err) {
    console.error("ADMIN GROUPS GET WARN: assigned students fetch failed", err)
    return []
  }
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

export async function GET(req: Request) {
  try {
    await requireUser(req, ["admin", "admin_agent"])
    const pb = await getAdminPb()

    const groupFetch = async () => {
      try {
        return await pb.collection("groups").getFullList({ sort: "-created", expand: "instructor" })
      } catch (err) {
        console.error("ADMIN GROUPS GET WARN: groups fetch with sort failed", err)
      }
      try {
        return await pb.collection("groups").getFullList({ expand: "instructor" })
      } catch (err) {
        console.error("ADMIN GROUPS GET WARN: groups fetch without sort failed", err)
      }
      // Last resort: fetch first page only
      const page = await pb.collection("groups").getList(1, 200, { expand: "instructor" })
      return page.items
    }

    const today = new Date().toISOString().slice(0, 10)

    const [groupRes, courseRes, bootcampRes, sessionRes] = await Promise.allSettled([
      groupFetch(),
      pb.collection("courses").getFullList({ sort: "title" }),
      pb.collection("bootcamps").getFullList({ sort: "title" }),
      pb.collection("sessions").getFullList({ filter: `date >= "${today}"`, sort: "date,start_time" }),
    ])

    const groupRecords = groupRes.status === "fulfilled" ? groupRes.value : []
    const courseRecords = courseRes.status === "fulfilled" ? courseRes.value : []
    const bootcampRecords = bootcampRes.status === "fulfilled" ? bootcampRes.value : []
    const sessionRecords = sessionRes.status === "fulfilled" ? sessionRes.value : []

    const formatPbError = (err: any) => ({
      message: err?.message,
      status: err?.status,
      data: err?.data,
      response: err?.response,
    })

    const warnings: string[] = []
    if (groupRes.status === "rejected") {
      console.error("ADMIN GROUPS GET WARN: groups collection fetch failed", formatPbError(groupRes.reason))
      warnings.push("groups_fetch_failed")
    }
    if (courseRes.status === "rejected") {
      console.error("ADMIN GROUPS GET WARN: courses collection fetch failed", formatPbError(courseRes.reason))
      warnings.push("courses_fetch_failed")
    }
    if (bootcampRes.status === "rejected") {
      console.error("ADMIN GROUPS GET WARN: bootcamps collection fetch failed", formatPbError(bootcampRes.reason))
      warnings.push("bootcamps_fetch_failed")
    }

    let studentRecords: any[] = []
    let instructorRecords: any[] = []
    try {
      const [allUsers, instructors] = await Promise.all([
        pb.collection("users").getFullList({ sort: "name" }).catch(() => []),
        getUsersByRole(pb, "instructor", { fields: "id,collectionId,name,surname,avatar", sort: "name" }).catch(() => []),
      ])
      instructorRecords = instructors
      // Treat everyone who is not admin/admin_agent/instructor as a student
      const nonStudentRoles = new Set(["admin", "admin_agent", "instructor"])
      studentRecords = (allUsers as any[]).filter((u: any) => !nonStudentRoles.has(u.role))
    } catch {
      studentRecords = []
      instructorRecords = []
    }

    const instructorMap = new Map(instructorRecords.map((u: any) => [u.id, u]))

    const resolveInstructors = (g: any) => {
      const ids = groupInstructorIds(g)
      const expanded = g.expand?.instructor
      const expandedList = Array.isArray(expanded) ? expanded : expanded ? [expanded] : []
      const expandedMap = new Map(expandedList.map((i: any) => [i.id, i]))
      return ids
        .map(id => expandedMap.get(id) || instructorMap.get(id))
        .filter(Boolean)
        .map((i: any) => ({ id: i.id, name: i.name || "", surname: i.surname || "", avatar: resolveAvatar(i) }))
    }

    const resolveInstructor = (g: any) => {
      // Prefer expand (most reliable), fall back to instructorMap lookup
      const instructors = resolveInstructors(g)
      if (instructors[0]) return instructors[0]
      if (g.expand?.instructor && !Array.isArray(g.expand.instructor)) {
        const i = g.expand.instructor
        return { id: i.id, name: i.name || "", surname: i.surname || "", avatar: resolveAvatar(i) }
      }
      if (g.instructor) {
        const i = instructorMap.get(g.instructor)
        if (i) return { id: i.id, name: i.name || "", surname: i.surname || "", avatar: resolveAvatar(i) }
      }
      return null
    }

    const groups = (groupRecords as any[]).map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
      programType: g.programType,
      courseId: g.course || "",
      bootcampId: g.bootcamp || "",
      studentIds: Array.isArray(g.students) ? g.students : [],
      instructorIds: groupInstructorIds(g),
      instructorId: groupInstructorIds(g)[0] || null,
      instructor: resolveInstructor(g),
      instructors: resolveInstructors(g),
      lockedModules: Array.isArray(g.lockedModules) ? g.lockedModules : [],
      unlockedModules: Array.isArray(g.unlockedModules) ? g.unlockedModules : [],
      lockedLessons: Array.isArray(g.lockedLessons) ? g.lockedLessons : [],
      unlockedLessons: Array.isArray(g.unlockedLessons) ? g.unlockedLessons : [],
      resourceMode: g.resourceMode || "default",
      schedules: (() => {
        const raw = g.schedules
        if (!raw) return []
        if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return [] } }
        if (Array.isArray(raw)) return raw
        return []
      })(),
      schedule_start_date: g.schedule_start_date ? g.schedule_start_date.slice(0, 10) : null,
      schedule_end_date: g.schedule_end_date ? g.schedule_end_date.slice(0, 10) : null,
    }))

    const courses = (courseRecords as any[]).map((c) => ({
      id: c.id,
      title: c.title,
      shortDescription: c.shortDescription || "",
      longDescription: c.longDescription || "",
      coverImage: c.coverImage || null,
    }))

    const bootcamps = (bootcampRecords as any[]).map((b) => ({
      id: b.id,
      title: b.title,
      shortDescription: b.shortDescription || "",
      longDescription: b.longDescription || "",
      coverImage: b.coverImage || null,
    }))

    const students = (studentRecords as any[]).map((u) => ({
      id: u.id,
      name: u.name || "",
      surname: u.surname || "",
      email: u.email || "",
      username: u.username || "",
      role: u.role || "student",
      avatar: resolveAvatar(u),
    }))

    const instructors = instructorRecords.map((u: any) => ({
      id: u.id,
      name: u.name || "",
      surname: u.surname || "",
      avatar: resolveAvatar(u),
    }))

    const sessions = (sessionRecords as any[]).map((s) => ({
      id: s.id,
      group: s.group,
      date: s.date.slice(0, 10),
      start_time: s.start_time || "",
      duration: s.duration || 120,
      mode: s.mode || "live_presentiel",
      title: s.title || null,
      is_cancelled: s.is_cancelled || false,
    }))

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
    groups.sort((a, b) => {
      if (a.status !== "in_progress" || b.status !== "in_progress") return 0
      const ta = a.id ? (nextTimeByGroup.get(a.id) ?? Infinity) : Infinity
      const tb = b.id ? (nextTimeByGroup.get(b.id) ?? Infinity) : Infinity
      return ta - tb
    })

    return NextResponse.json({ ok: true, groups, courses, bootcamps, students, instructors, sessions, warnings })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("ADMIN GROUPS GET ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireUser(req, ["admin", "admin_agent"])
    const payload = (await req.json()) as IncomingGroup
    const pb = await getAdminPb()

    const title = (payload.title || "").trim()
    const status = payload.status
    const programType = payload.programType
    const courseId = payload.courseId || ""
    const bootcampId = payload.bootcampId || ""
    const rawInstructorIds = Array.isArray(payload.instructorIds)
      ? payload.instructorIds.filter(Boolean)
      : payload.instructorId ? [payload.instructorId] : []
    const instructorIds = programType === "bootcamp" ? rawInstructorIds : rawInstructorIds.slice(0, 1)
    const studentIds = Array.isArray(payload.studentIds) ? payload.studentIds : []
    const lockedModules = Array.isArray(payload.lockedModules) ? payload.lockedModules : []
    const unlockedModules = Array.isArray(payload.unlockedModules) ? payload.unlockedModules : []
    const lockedLessons = Array.isArray(payload.lockedLessons) ? payload.lockedLessons : []
    const unlockedLessons = Array.isArray(payload.unlockedLessons) ? payload.unlockedLessons : []

    if (!title) {
      return NextResponse.json({ error: "Le nom du groupe est obligatoire." }, { status: 400 })
    }
    if (!status || !programType) {
      return NextResponse.json({ error: "Statut et type de programme requis." }, { status: 400 })
    }
    if (programType === "course" && !courseId) {
      return NextResponse.json({ error: "Veuillez choisir une formation." }, { status: 400 })
    }
    if (programType === "bootcamp" && !bootcampId) {
      return NextResponse.json({ error: "Veuillez choisir un bootcamp." }, { status: 400 })
    }

    const dataToSave: any = {
      title,
      status,
      programType,
      course: programType === "course" ? courseId : null,
      bootcamp: programType === "bootcamp" ? bootcampId : null,
      instructor: instructorIds,
      students: studentIds,
      lockedModules,
      unlockedModules,
      lockedLessons,
      unlockedLessons,
      resourceMode: payload.resourceMode || "default",
    }

    if (payload.schedules !== undefined) {
      dataToSave.schedules = Array.isArray(payload.schedules) ? payload.schedules : []
    }
    if (payload.schedule_start_date !== undefined) dataToSave.schedule_start_date = payload.schedule_start_date || null
    if (payload.schedule_end_date !== undefined) dataToSave.schedule_end_date = payload.schedule_end_date || null

    let record: any
    if (payload.id) {
      record = await pb.collection("groups").update(payload.id, dataToSave, { expand: "instructor" })
    } else {
      record = await pb.collection("groups").create(dataToSave, { expand: "instructor" })
    }

    const expandedInstructor = record.expand?.instructor
    const expandedInstructors = (Array.isArray(expandedInstructor) ? expandedInstructor : expandedInstructor ? [expandedInstructor] : [])
      .map((i: any) => ({ id: i.id, name: i.name || "", surname: i.surname || "", avatar: resolveAvatar(i) }))
    const resolvedInstructor = expandedInstructors[0] ?? null

    const group = {
      id: record.id,
      title: record.title,
      status: record.status,
      programType: record.programType,
      courseId: record.course || "",
      bootcampId: record.bootcamp || "",
      instructorIds: groupInstructorIds(record),
      instructorId: groupInstructorIds(record)[0] || null,
      instructor: resolvedInstructor,
      instructors: expandedInstructors,
      studentIds: Array.isArray(record.students) ? record.students : [],
      lockedModules: Array.isArray(record.lockedModules) ? record.lockedModules : [],
      unlockedModules: Array.isArray(record.unlockedModules) ? record.unlockedModules : [],
      lockedLessons: Array.isArray(record.lockedLessons) ? record.lockedLessons : [],
      unlockedLessons: Array.isArray(record.unlockedLessons) ? record.unlockedLessons : [],
      resourceMode: record.resourceMode || "default",
      schedules: (() => {
        const raw = record.schedules
        if (!raw) return []
        if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return [] } }
        if (Array.isArray(raw)) return raw
        return []
      })(),
      schedule_start_date: record.schedule_start_date ? record.schedule_start_date.slice(0, 10) : null,
      schedule_end_date: record.schedule_end_date ? record.schedule_end_date.slice(0, 10) : null,
    }

    return NextResponse.json({ ok: true, group })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("ADMIN GROUPS POST ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
