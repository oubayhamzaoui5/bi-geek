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
    groupTitle: "",
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pb = await getAdminPb()
    const { id } = await params

    // Guard: refuse to delete completed (past) sessions
    const existing = await pb.collection("sessions").getOne(id)
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    if (existing.date.slice(0, 10) < todayStr) {
      return NextResponse.json({ error: "Les sessions passées ne peuvent pas être supprimées." }, { status: 403 })
    }

    try {
      if ((existing as any).googleEventId) {
        await deleteMeetEvent((existing as any).googleEventId)
      }
    } catch (meetErr) {
      console.error("GOOGLE MEET DELETE ERROR:", meetErr)
    }

    await pb.collection("sessions").delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN SESSIONS DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// PATCH — update single session or all following sessions in the same slot
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pb = await getAdminPb()
    const { id } = await params
    const payload = await req.json()

    const { updateMode = "single", ...fields } = payload

    // Build update payload from allowed fields
    const data: any = {}
    if (fields.date !== undefined) data.date = fields.date
    if (fields.start_time !== undefined) data.start_time = fields.start_time
    if (fields.duration !== undefined) data.duration = fields.duration
    if (fields.title !== undefined) data.title = fields.title
    if (fields.notes !== undefined) data.notes = fields.notes
    if (fields.is_cancelled !== undefined) data.is_cancelled = fields.is_cancelled
    if (fields.instructor !== undefined) data.instructor = fields.instructor

    if (updateMode === "single") {
      // Guard: refuse to modify completed (past) sessions
      const existing = await pb.collection("sessions").getOne(id)
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
      if (existing.date.slice(0, 10) < todayStr) {
        return NextResponse.json({ error: "Les sessions passées ne peuvent pas être modifiées." }, { status: 403 })
      }
      const record = await pb.collection("sessions").update(id, data)
      if ((record as any).googleEventId && (fields.date || fields.start_time || fields.duration || fields.title)) {
        try {
          await updateMeetEvent({
            googleEventId: (record as any).googleEventId,
            title: fields.title,
            date: fields.date,
            startTime: fields.start_time,
            duration: fields.duration,
          })
        } catch (meetErr) {
          console.error("GOOGLE MEET UPDATE ERROR:", meetErr)
        }
      }
      return NextResponse.json({ ok: true, sessions: [formatSession(record)] })
    }

    if (updateMode === "all_following") {
      // Fetch the current session to know group, date, and slot (start_time)
      const current = await pb.collection("sessions").getOne(id)
      const dateStr = current.date.slice(0, 10)
      const startTime = current.start_time || ""

      // Today in YYYY-MM-DD — never touch past (completed) sessions
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

      // All sessions of the same group + same slot, from this date onwards, not in the past
      const effectiveFrom = dateStr > todayStr ? dateStr : todayStr
      const filter = startTime
        ? `group = "${current.group}" && start_time = "${startTime}" && date >= "${effectiveFrom}"`
        : `group = "${current.group}" && date >= "${effectiveFrom}"`

      const following = await pb.collection("sessions").getFullList({ filter, sort: "date" })

      const updated = await Promise.all(
        following.map(s => pb.collection("sessions").update(s.id, data))
      )

      await Promise.allSettled(
        updated
          .filter((s: any) => s.googleEventId && (fields.start_time || fields.duration || fields.title))
          .map((s: any) =>
            updateMeetEvent({
              googleEventId: s.googleEventId,
              title: fields.title,
              date: s.date?.slice(0, 10),
              startTime: fields.start_time,
              duration: fields.duration,
            })
          )
      )

      return NextResponse.json({ ok: true, sessions: updated.map(formatSession) })
    }

    return NextResponse.json({ error: "updateMode invalide." }, { status: 400 })
  } catch (err: any) {
    console.error("ADMIN SESSIONS PATCH ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
