import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

type IncomingGroup = {
  id?: string
  title: string
  status: "not_started" | "in_progress" | "completed"
  programType: "course" | "bootcamp"
  courseId?: string | null
  bootcampId?: string | null
  studentIds?: string[]
  lockedModules?: string[]
  unlockedModules?: string[]
  lockedLessons?: string[]
  unlockedLessons?: string[]
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

export async function GET() {
  try {
    const pb = await getAdminPb()

    const groupFetch = async () => {
      try {
        return await pb.collection("groups").getFullList({ sort: "-created" })
      } catch (err) {
        console.error("ADMIN GROUPS GET WARN: groups fetch with sort failed", err)
      }
      try {
        return await pb.collection("groups").getFullList()
      } catch (err) {
        console.error("ADMIN GROUPS GET WARN: groups fetch without sort failed", err)
      }
      // Last resort: fetch first page only
      const page = await pb.collection("groups").getList(1, 200)
      return page.items
    }

    const [groupRes, courseRes, bootcampRes] = await Promise.allSettled([
      groupFetch(),
      pb.collection("courses").getFullList({ sort: "title" }),
      pb.collection("bootcamps").getFullList({ sort: "title" }),
    ])

    const groupRecords = groupRes.status === "fulfilled" ? groupRes.value : []
    const courseRecords = courseRes.status === "fulfilled" ? courseRes.value : []
    const bootcampRecords = bootcampRes.status === "fulfilled" ? bootcampRes.value : []

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
    try {
      studentRecords = await pb.collection("users").getFullList({ filter: 'role="student"', sort: "name" })
    } catch {
      studentRecords = await pb.collection("users").getFullList({ sort: "name" })
    }

    const groups = (groupRecords as any[]).map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
      programType: g.programType,
      courseId: g.course || "",
      bootcampId: g.bootcamp || "",
      studentIds: Array.isArray(g.students) ? g.students : [],
      lockedModules: Array.isArray(g.lockedModules) ? g.lockedModules : [],
      unlockedModules: Array.isArray(g.unlockedModules) ? g.unlockedModules : [],
      lockedLessons: Array.isArray(g.lockedLessons) ? g.lockedLessons : [],
      unlockedLessons: Array.isArray(g.unlockedLessons) ? g.unlockedLessons : [],
    }))

    const courses = (courseRecords as any[]).map((c) => ({
      id: c.id,
      title: c.title,
      shortDescription: c.shortDescription || "",
    }))

    const bootcamps = (bootcampRecords as any[]).map((b) => ({
      id: b.id,
      title: b.title,
      shortDescription: b.shortDescription || "",
    }))

    const students = (studentRecords as any[]).map((u) => ({
      id: u.id,
      name: u.name || "",
      surname: u.surname || "",
      email: u.email || "",
      username: u.username || "",
    }))

    return NextResponse.json({ ok: true, groups, courses, bootcamps, students, warnings })
  } catch (err: any) {
    console.error("ADMIN GROUPS GET ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as IncomingGroup
    const pb = await getAdminPb()

    const title = (payload.title || "").trim()
    const status = payload.status
    const programType = payload.programType
    const courseId = payload.courseId || ""
    const bootcampId = payload.bootcampId || ""
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
      students: studentIds,
      lockedModules,
      unlockedModules,
      lockedLessons,
      unlockedLessons,
    }

    let record: any
    if (payload.id) {
      record = await pb.collection("groups").update(payload.id, dataToSave)
    } else {
      record = await pb.collection("groups").create(dataToSave)
    }

    const group = {
      id: record.id,
      title: record.title,
      status: record.status,
      programType: record.programType,
      courseId: record.course || "",
      bootcampId: record.bootcamp || "",
      studentIds: Array.isArray(record.students) ? record.students : [],
      lockedModules: Array.isArray(record.lockedModules) ? record.lockedModules : [],
      unlockedModules: Array.isArray(record.unlockedModules) ? record.unlockedModules : [],
      lockedLessons: Array.isArray(record.lockedLessons) ? record.lockedLessons : [],
      unlockedLessons: Array.isArray(record.unlockedLessons) ? record.unlockedLessons : [],
    }

    return NextResponse.json({ ok: true, group })
  } catch (err: any) {
    console.error("ADMIN GROUPS POST ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
