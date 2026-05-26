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

function normalizeIds(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [String(value)] : []
}

function groupInstructorIds(group: any): string[] {
  const ids = normalizeIds(group?.instructor)
  return group?.programType === "bootcamp" ? ids : ids.slice(0, 1)
}

export async function POST(req: Request) {
  try {
    const { sessionId, instructorId } = await req.json()
    if (!sessionId || !instructorId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const pb = await getAdminPb()
    const session = await pb.collection("sessions").getOne(sessionId, { expand: "group" })

    if (!groupInstructorIds(session.expand?.group).includes(instructorId)) {
      return NextResponse.json({ error: "Unauthorized access to this group" }, { status: 403 })
    }

    const updated = await pb.collection("sessions").update(sessionId, {
      is_ended: true,
      ended_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, session: updated })
  } catch (err: any) {
    console.error("END SESSION ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
