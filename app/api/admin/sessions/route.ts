import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { authErrorResponse, requireUser } from "@/lib/server-auth"

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

function nextDate(date: string) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// POST — create a new session record
export async function POST(req: Request) {
  try {
    await requireUser(req, ["admin", "admin_agent"])
    const pb = await getAdminPb()
    const payload = await req.json()

    const data: any = {
      group: payload.group,
      date: payload.date,
      start_time: payload.start_time || "",
      duration: payload.duration || 120,
      mode: "live_presentiel",
      title: payload.title || null,
      notes: payload.notes || "",
      is_cancelled: payload.is_cancelled || false,
      instructor: payload.instructor || null,
    }

    const record = await pb.collection("sessions").create(data, { expand: "group" })
    return NextResponse.json({ ok: true, session: formatSession(record) })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("ADMIN SESSIONS POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// GET — fetch sessions; pass from+to for a date range, or omit to fetch all
export async function GET(req: Request) {
  try {
    await requireUser(req, ["admin", "admin_agent"])
    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to   = searchParams.get("to")

    const pb = await getAdminPb()

    const records = await pb.collection("sessions").getFullList({
      filter: from && to ? `date >= "${from}" && date < "${nextDate(to)}"` : undefined,
      sort: "date,start_time",
      expand: "group",
    })

    const sessions = records.map(formatSession)
    return NextResponse.json({ ok: true, sessions })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("ADMIN SESSIONS GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
