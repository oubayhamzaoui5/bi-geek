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

function formatSession(s: any): any {
  return {
    id: s.id,
    group: s.group,
    groupTitle: s.expand?.group?.title || "",
    date: s.date.slice(0, 10),
    start_time: s.start_time || "",
    duration: s.duration || 120,
    mode: s.mode || "live_presentiel",
    title: s.title || null,
    notes: s.notes || "",
    is_cancelled: s.is_cancelled || false,
    instructor: s.instructor || null,
    joinUrl: s.joinUrl || null,
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    if (!studentId) {
      return NextResponse.json({ error: "studentId requis" }, { status: 400 })
    }
    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    assertSelfOrRole(user, studentId)

    const pb = await getAdminPb()
    let groups: any[] = []

    try {
      groups = await pb.collection("groups").getFullList({
        filter: `students ~ "${studentId}"`,
        fields: "id",
      })
    } catch {
      const allGroups = await pb.collection("groups").getFullList({ fields: "id,students" })
      groups = allGroups.filter((g: any) => {
        if (!g.students) return false
        if (Array.isArray(g.students)) return g.students.includes(studentId)
        return g.students === studentId
      })
    }

    if (groups.length === 0) {
      return NextResponse.json({ ok: true, sessions: [] })
    }

    const groupFilter = groups.map((g: any) => `group = "${g.id}"`).join(" || ")
    const dateFilter =
      from && to
        ? ` && date >= "${from}" && date <= "${to}"`
        : from
          ? ` && date >= "${from}"`
          : to
            ? ` && date <= "${to}"`
            : ""

    const records = await pb.collection("sessions").getFullList({
      filter: `(${groupFilter})${dateFilter}`,
      sort: "date,start_time",
      expand: "group",
    })

    return NextResponse.json({ ok: true, sessions: records.map(formatSession) })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("STUDENT SESSIONS GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
