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

function formatSession(s: any): any {
  return {
    id: s.id,
    group: s.group,
    groupTitle: s.expand?.group?.title || "",
    date: s.date.slice(0, 10),
    start_time: s.start_time || "",
    duration: s.duration || 120,
    mode: s.mode || "not_set",
    title: s.title || null,
    notes: s.notes || "",
    is_cancelled: s.is_cancelled || false,
    instructor: s.instructor || null,
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const pb = await getAdminPb()
    const payload = await req.json()
    const { id } = await context.params

    const data: any = {}
    if (payload.group !== undefined) data.group = payload.group
    if (payload.date !== undefined) data.date = payload.date
    if (payload.start_time !== undefined) data.start_time = payload.start_time
    if (payload.duration !== undefined) data.duration = payload.duration
    if (payload.mode !== undefined) data.mode = payload.mode
    if (payload.title !== undefined) data.title = payload.title
    if (payload.notes !== undefined) data.notes = payload.notes
    if (payload.is_cancelled !== undefined) data.is_cancelled = payload.is_cancelled
    if (payload.instructor !== undefined) data.instructor = payload.instructor

    const record = await pb.collection("sessions").update(id, data, { expand: "group" })
    return NextResponse.json({ ok: true, session: formatSession(record) })
  } catch (err: any) {
    console.error("INSTRUCTOR SESSIONS PATCH ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const pb = await getAdminPb()
    const { id } = await context.params
    await pb.collection("sessions").delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("INSTRUCTOR SESSIONS DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
