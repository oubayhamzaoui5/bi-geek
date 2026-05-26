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

// GET /api/student/instructors?studentId=xxx
// Returns all instructors whose groups this student belongs to
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    if (!studentId) return NextResponse.json({ error: "studentId requis" }, { status: 400 })

    const pb = await getAdminPb()

    // Find all groups containing this student
    const groups = await pb.collection("groups").getFullList({
      filter: `students ~ "${studentId}"`,
      fields: "id,title,instructor,programType",
    }).catch(async () => {
      // Fallback: fetch all and filter in memory
      const all = await pb.collection("groups").getFullList({ fields: "id,title,instructor,programType,students" })
      return all.filter((g: any) => {
        if (!g.students) return false
        if (Array.isArray(g.students)) return g.students.includes(studentId)
        return g.students === studentId
      })
    })

    const instructorIds = [...new Set(groups.flatMap((g: any) => groupInstructorIds(g)).filter(Boolean))] as string[]

    if (instructorIds.length === 0) {
      return NextResponse.json({ ok: true, instructors: [] })
    }

    // Fetch instructor user records
    const instructorRecords = await Promise.allSettled(
      instructorIds.map(id => pb.collection("users").getOne(id))
    )

    const instructors = instructorRecords
      .filter(r => r.status === "fulfilled")
      .map(r => {
        const u = (r as PromiseFulfilledResult<any>).value
        return {
          id: u.id,
          name: u.name || "",
          surname: u.surname || "",
          username: u.username || "",
          avatar: resolveAvatar(u),
          groups: groups
            .filter((g: any) => groupInstructorIds(g).includes(u.id))
            .map((g: any) => ({ groupId: g.id, groupTitle: g.title })),
        }
      })

    return NextResponse.json({ ok: true, instructors })
  } catch (err: any) {
    console.error("STUDENT INSTRUCTORS GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
