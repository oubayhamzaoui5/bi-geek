import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { assertSelfOrRole, authErrorResponse, requireUser } from "@/lib/server-auth"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

// GET — fetch presence for a student on a session
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    if (!studentId) return NextResponse.json({ presence: null })
    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    assertSelfOrRole(user, studentId)

    const pb = await getAdminPb()

    const session = await pb.collection("sessions").getOne(id, { expand: "group" }).catch(() => null)
    if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 })
    if (!isStudentInGroup(session.expand?.group, studentId)) {
      return NextResponse.json({ error: "Permission refusee." }, { status: 403 })
    }

    const presence = await pb.collection("session_presence").getFirstListItem(
      `session = "${id}" && student = "${studentId}"`
    ).catch(() => null)

    return NextResponse.json({
      session: {
        id: session.id,
        groupTitle: session.expand?.group?.title || "",
        date: session.date.slice(0, 10),
        start_time: session.start_time || "",
        duration: session.duration || 120,
        title: session.title || null,
        mode: session.mode || "live_presentiel",
      },
      presence: presence ? { status: presence.status, confirmed_at: presence.confirmed_at } : null,
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// POST — submit or update presence for a student
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { studentId, status } = await req.json()

    const validStatuses = ["presentiel", "en_ligne", "pas_sur", "absent"]
    if (!studentId || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    }

    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    assertSelfOrRole(user, studentId)

    const pb = await getAdminPb()
    const session = await pb.collection("sessions").getOne(id, { expand: "group" }).catch(() => null)
    if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 })
    if (!isStudentInGroup(session.expand?.group, studentId)) {
      return NextResponse.json({ error: "Permission refusee." }, { status: 403 })
    }

    const existing = await pb.collection("session_presence").getFirstListItem(
      `session = "${id}" && student = "${studentId}"`
    ).catch(() => null)

    const data = { session: id, student: studentId, status, confirmed_at: new Date().toISOString() }

    if (existing) {
      await pb.collection("session_presence").update(existing.id, data)
    } else {
      await pb.collection("session_presence").create(data)
    }

    return NextResponse.json({ ok: true, status })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("PRESENCE POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

function isStudentInGroup(group: any, studentId: string) {
  const students = Array.isArray(group?.students) ? group.students : []
  return students.includes(studentId)
}
