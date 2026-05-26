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
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  return [String(value)]
}

function groupInstructorIds(group: any): string[] {
  const ids = normalizeIds(group?.instructor)
  return group?.programType === "bootcamp" ? ids : ids.slice(0, 1)
}

async function fetchInstructorGroups(pb: PocketBase, instructorId: string) {
  const byId = new Map<string, any>()
  const attempts = [
    () => pb.collection("groups").getFullList({ filter: `instructor = "${instructorId}"` }),
    () => pb.collection("groups").getFullList({ filter: `instructor ~ "${instructorId}"` }),
  ]

  for (const attempt of attempts) {
    try {
      const groups = await attempt()
      groups.forEach((g: any) => byId.set(g.id, g))
    } catch {}
  }

  try {
    const all = await pb.collection("groups").getFullList()
    all
      .filter((g: any) => groupInstructorIds(g).includes(instructorId))
      .forEach((g: any) => byId.set(g.id, g))
  } catch {}
  return Array.from(byId.values())
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const instructorId = searchParams.get("instructorId")
    if (!instructorId) return NextResponse.json({ error: "instructorId requis" }, { status: 400 })

    const pb = await getAdminPb()

    // Get instructor's groups
    const groups = await fetchInstructorGroups(pb, instructorId)

    if (groups.length === 0) {
      return NextResponse.json({ ok: true, students: [] })
    }

    // Fetch courses and bootcamps for display
    const [courseRes, bootcampRes] = await Promise.allSettled([
      pb.collection("courses").getFullList({ fields: "id,title" }),
      pb.collection("bootcamps").getFullList({ fields: "id,title" }),
    ])
    const courseMap: Record<string, string> = {}
    if (courseRes.status === "fulfilled") courseRes.value.forEach((c: any) => { courseMap[c.id] = c.title })
    const bootcampMap: Record<string, string> = {}
    if (bootcampRes.status === "fulfilled") bootcampRes.value.forEach((b: any) => { bootcampMap[b.id] = b.title })

    // Build map of student -> groups
    const studentGroupMap: Record<string, { groupId: string; groupTitle: string; programTitle: string }[]> = {}
    for (const g of groups) {
      const programTitle = g.course
        ? (courseMap[g.course] || "")
        : g.bootcamp
          ? (bootcampMap[g.bootcamp] || "")
          : ""
      const studentIds: string[] = g.students || []
      for (const sid of studentIds) {
        if (!studentGroupMap[sid]) studentGroupMap[sid] = []
        studentGroupMap[sid].push({ groupId: g.id, groupTitle: g.title, programTitle })
      }
    }

    const allStudentIds = Object.keys(studentGroupMap)
    if (allStudentIds.length === 0) {
      return NextResponse.json({ ok: true, students: [] })
    }

    const filter = allStudentIds.map(id => `id = "${id}"`).join(" || ")
    const userRecords = await pb.collection("users").getFullList({ filter })

    const students = userRecords.map((u: any) => ({
      id: u.id,
      username: u.username || "",
      email: u.email || "",
      phone: u.phone || "",
      avatar: resolveAvatar(u),
      groups: studentGroupMap[u.id] || [],
      created: u.created,
    }))

    return NextResponse.json({ ok: true, students })
  } catch (err: any) {
    console.error("INSTRUCTOR STUDENTS GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
