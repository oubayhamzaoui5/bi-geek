import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { createMeetEvent } from "@/lib/google-calendar"

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

// GET — fetch sessions for instructor's groups, optionally filtered by date range
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const instructorId = searchParams.get("instructorId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    if (!instructorId) return NextResponse.json({ error: "instructorId requis" }, { status: 400 })

    const pb = await getAdminPb()

    // Get instructor's group IDs
    const groups = await pb.collection("groups").getFullList({
      filter: `instructor = "${instructorId}"`,
      fields: "id",
    })

    if (groups.length === 0) {
      return NextResponse.json({ ok: true, sessions: [] })
    }

    const groupFilter = groups.map((g: any) => `group = "${g.id}"`).join(" || ")
    const dateFilter = from && to ? ` && date >= "${from}" && date <= "${to}"` : ""

    const records = await pb.collection("sessions").getFullList({
      filter: `(${groupFilter})${dateFilter}`,
      sort: "date,start_time",
      expand: "group",
    })

    return NextResponse.json({ ok: true, sessions: records.map(formatSession) })
  } catch (err: any) {
    console.error("INSTRUCTOR SESSIONS GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// POST — create a new session
export async function POST(req: Request) {
  try {
    const pb = await getAdminPb()
    const payload = await req.json()

    const record = await pb.collection("sessions").create({
      group:        payload.group,
      date:         payload.date,
      start_time:   payload.start_time || "",
      duration:     payload.duration || 120,
      mode:         "live_presentiel",
      title:        payload.title || null,
      notes:        payload.notes || "",
      is_cancelled: payload.is_cancelled || false,
      instructor:   payload.instructor || null,
    }, { expand: "group" })

    // Auto-create Google Meet event
    try {
      const { googleEventId, joinUrl } = await createMeetEvent({
        requestId: record.id,
        title:     payload.title || "Séance de formation",
        date:      payload.date,
        startTime: payload.start_time || "09:00",
        duration:  payload.duration || 120,
      })
      if (googleEventId || joinUrl) {
        await pb.collection("sessions").update(record.id, { googleEventId, joinUrl })
        ;(record as any).googleEventId = googleEventId
        ;(record as any).joinUrl       = joinUrl
      }
    } catch (meetErr) {
      console.error("GOOGLE MEET CREATE ERROR:", meetErr)
    }

    return NextResponse.json({ ok: true, session: formatSession(record) })
  } catch (err: any) {
    console.error("INSTRUCTOR SESSIONS POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
