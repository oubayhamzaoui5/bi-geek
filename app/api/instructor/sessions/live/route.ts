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

async function getMeetingAttendees(pb: PocketBase, group: any) {
  const emails = new Set<string>()

  if (group?.expand?.instructor?.email) {
    emails.add(String(group.expand.instructor.email))
  } else if (group?.instructor) {
    try {
      const instructor = await pb.collection("users").getOne(group.instructor)
      if (instructor.email) emails.add(String(instructor.email))
    } catch {}
  }

  const studentIds: string[] = Array.isArray(group?.students) ? group.students : []
  if (studentIds.length > 0) {
    try {
      const filter = studentIds.map(id => `id = "${id}"`).join(" || ")
      const students = await pb.collection("users").getFullList({ filter })
      for (const student of students as any[]) {
        if (student.email) emails.add(String(student.email))
      }
    } catch {}
  }

  return Array.from(emails)
}

export async function POST(req: Request) {
  try {
    const { sessionId, instructorId } = await req.json()
    if (!sessionId || !instructorId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const pb = await getAdminPb()
    const session = await pb.collection("sessions").getOne(sessionId, { expand: "group" })
    const group = session.expand?.group
    
    if (group?.instructor !== instructorId) {
      return NextResponse.json({ error: "Unauthorized access to this group" }, { status: 403 })
    }

    if (session.joinUrl) {
      return NextResponse.json({
        ok: true,
        joinUrl: session.joinUrl,
        googleEventId: session.googleEventId || null,
      })
    }

    const sessionDateStr = session.date ? session.date.substring(0, 10) : new Date().toISOString().substring(0, 10)
    const sessionTimeStr = session.start_time || "10:00"
    const durationMins = session.duration || 120
    const title = `${session.title || "Séance Live"} - ${group?.title || "Groupe"}`
    const attendees = await getMeetingAttendees(pb, group)

    const { googleEventId, joinUrl: link } = await createMeetEvent({
      requestId: sessionId,
      title,
      date: sessionDateStr,
      startTime: sessionTimeStr,
      duration: durationMins,
      attendees,
    })

    const gEventId = googleEventId || ""

    if (!link) {
      return NextResponse.json({ error: "Aucun lien Meet renvoyé par Google" }, { status: 500 })
    }

    // Save strictly to pocketbase
    await pb.collection("sessions").update(sessionId, { joinUrl: link, googleEventId: gEventId })

    return NextResponse.json({ ok: true, joinUrl: link, googleEventId: gEventId })
  } catch (err: any) {
    console.error("CREATE LIVE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
