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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pb = await getAdminPb()

    const session = await pb.collection("sessions").getOne(id).catch(() => null)
    if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 })

    // Get all students in the group
    const group = await pb.collection("groups").getOne(session.group, {
      fields: "id,title,students",
    }).catch(() => null)

    const studentIds: string[] = Array.isArray(group?.students) ? group.students : []

    let students: any[] = []
    if (studentIds.length > 0) {
      const filter = studentIds.map((sid: string) => `id = "${sid}"`).join(" || ")
      students = await pb.collection("users").getFullList({
        filter,
        fields: "id,name,surname,email",
        sort: "name",
      }).catch(() => [])
    }

    // Get all presences for this session
    const presences = await pb.collection("session_presence").getFullList({
      filter: `session = "${id}"`,
    }).catch(() => [])

    const presenceMap = new Map(presences.map((p: any) => [p.student, p]))

    const result = students.map((s: any) => {
      const p = presenceMap.get(s.id)
      return {
        id: s.id,
        name: s.name || "",
        surname: s.surname || "",
        email: s.email || "",
        status: p?.status || null,
        confirmed_at: p?.confirmed_at || null,
      }
    })

    return NextResponse.json({ ok: true, students: result, groupTitle: group?.title || "" })
  } catch (err: any) {
    console.error("ADMIN SESSION PRESENCE GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
