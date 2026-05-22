import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { updateMeetEvent, deleteMeetEvent } from "@/lib/google-calendar"

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
    mode: s.mode || "live_presentiel",
    title: s.title || null,
    notes: s.notes || "",
    is_cancelled: s.is_cancelled || false,
    instructor: s.instructor || null,
    joinUrl: s.joinUrl || null,
    googleEventId: s.googleEventId || null,
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const pb = await getAdminPb()
    const payload = await req.json()
    const { id } = await context.params

    const data: any = {}
    if (payload.group        !== undefined) data.group        = payload.group
    if (payload.date         !== undefined) data.date         = payload.date
    if (payload.start_time   !== undefined) data.start_time   = payload.start_time
    if (payload.duration     !== undefined) data.duration     = payload.duration
    if (payload.title        !== undefined) data.title        = payload.title
    if (payload.notes        !== undefined) data.notes        = payload.notes
    if (payload.is_cancelled !== undefined) data.is_cancelled = payload.is_cancelled
    if (payload.instructor   !== undefined) data.instructor   = payload.instructor

    const record = await pb.collection("sessions").update(id, data, { expand: "group" })

    // Sync Google Calendar event if date/time/title changed
    const googleEventId = (record as any).googleEventId
    if (googleEventId && (payload.date || payload.start_time || payload.duration || payload.title)) {
      try {
        await updateMeetEvent({
          googleEventId,
          title:     payload.title,
          date:      payload.date,
          startTime: payload.start_time,
          duration:  payload.duration,
        })
      } catch (meetErr) {
        console.error("GOOGLE MEET UPDATE ERROR:", meetErr)
      }
    }

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

    // Delete Google Calendar event before removing from DB
    try {
      const session = await pb.collection("sessions").getOne(id)
      if ((session as any).googleEventId) {
        await deleteMeetEvent((session as any).googleEventId)
      }
    } catch (meetErr) {
      console.error("GOOGLE MEET DELETE ERROR:", meetErr)
    }

    await pb.collection("sessions").delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("INSTRUCTOR SESSIONS DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
