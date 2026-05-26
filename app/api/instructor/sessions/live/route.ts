import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { sendMeetLinkCreatedEmail } from "@/lib/email"
import { createMeetEvent } from "@/lib/google-calendar"

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

async function getMeetingAttendees(pb: PocketBase, group: any) {
  const emails = new Set<string>()

  const expanded = group?.expand?.instructor
  const expandedList = Array.isArray(expanded) ? expanded : expanded ? [expanded] : []
  for (const instructor of expandedList) {
    if (instructor.email) emails.add(String(instructor.email))
  }
  if (expandedList.length === 0 && group?.instructor) {
    try {
      const filter = groupInstructorIds(group).map(id => `id = "${id}"`).join(" || ")
      const instructors = filter ? await pb.collection("users").getFullList({ filter }) : []
      for (const instructor of instructors as any[]) if (instructor.email) emails.add(String(instructor.email))
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

async function getGroupStudents(pb: PocketBase, group: any) {
  const studentIds: string[] = Array.isArray(group?.students) ? group.students : []
  if (studentIds.length === 0) return []
  const filter = studentIds.map(id => `id = "${id}"`).join(" || ")
  return pb.collection("users").getFullList({ filter, fields: "id,email,name,surname,username" }).catch(() => [])
}

function displayName(user: any) {
  return [user?.name, user?.surname].filter(Boolean).join(" ") || user?.username || ""
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

    if (!groupInstructorIds(group).includes(instructorId)) {
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
    const title = `${session.title || "Seance Live"} - ${group?.title || "Groupe"}`
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
      return NextResponse.json({ error: "Aucun lien Meet renvoye par Google" }, { status: 500 })
    }

    await pb.collection("sessions").update(sessionId, { joinUrl: link, googleEventId: gEventId })

    const students = await getGroupStudents(pb, group)
    await Promise.allSettled(
      students
        .filter((student: any) => student.email)
        .map((student: any) =>
          sendMeetLinkCreatedEmail({
            to: student.email,
            name: displayName(student),
            session: {
              title: session.title || "Seance de formation",
              groupTitle: group?.title || "Groupe",
              date: sessionDateStr,
              startTime: sessionTimeStr,
              duration: durationMins,
              joinUrl: link,
            },
          })
        )
    )

    return NextResponse.json({ ok: true, joinUrl: link, googleEventId: gEventId })
  } catch (err: any) {
    console.error("CREATE LIVE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
