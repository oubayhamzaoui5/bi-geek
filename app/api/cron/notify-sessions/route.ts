import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import webpush from "web-push"
import { sendDailySessionEmail } from "@/lib/email"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const xSecret = req.headers.get("x-cron-secret")
  if (xSecret === cronSecret) return true
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${cronSecret}`) return true
  return false
}

async function runNotifications(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 })
  }

  try {
    const pb = await getAdminPb()
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: process.env.APP_TIMEZONE || "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())

    const sessions = await pb.collection("sessions").getFullList({
      filter: `date = "${today}" && is_cancelled = false`,
      expand: "group",
      sort: "start_time",
    })

    if (sessions.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    const groupIds = [...new Set(sessions.map((s: any) => s.group))]
    const groups = await pb.collection("groups").getFullList({
      filter: groupIds.map((id) => `id = "${id}"`).join(" || "),
      fields: "id,title,students,instructor,programType",
    }).catch(() => [])

    const groupStudentMap = new Map<string, string[]>(
      groups.map((g: any) => [g.id, Array.isArray(g.students) ? g.students : []])
    )
    const groupMap = new Map<string, any>(groups.map((g: any) => [g.id, g]))

    const studentSessionMap = new Map<string, typeof sessions>()
    for (const s of sessions) {
      const students = groupStudentMap.get(s.group) || []
      for (const sid of students) {
        if (!studentSessionMap.has(sid)) studentSessionMap.set(sid, [])
        studentSessionMap.get(sid)!.push(s)
      }
    }

    const instructorSessionMap = new Map<string, typeof sessions>()
    for (const s of sessions) {
      const group = groupMap.get(s.group)
      const instructorIds = normalizeIds(group?.instructor)
      for (const instructorId of instructorIds) {
        if (!instructorSessionMap.has(instructorId)) instructorSessionMap.set(instructorId, [])
        instructorSessionMap.get(instructorId)!.push(s)
      }
    }

    const studentIds = [...studentSessionMap.keys()]
    const instructorIds = [...instructorSessionMap.keys()]
    if (studentIds.length === 0 && instructorIds.length === 0) return NextResponse.json({ ok: true, sent: 0, emails: 0 })

    const userIds = [...new Set([...studentIds, ...instructorIds])]
    const users = userIds.length
      ? await pb.collection("users").getFullList({
          filter: userIds.map((id) => `id = "${id}"`).join(" || "),
          fields: "id,email,name,surname,username,role",
        }).catch(() => [])
      : []
    const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]))

    let emails = 0
    for (const [studentId, studentSessions] of studentSessionMap.entries()) {
      const user = userMap.get(studentId)
      if (!user?.email) continue
      try {
        await sendDailySessionEmail({
          to: user.email,
          name: displayName(user),
          role: "student",
          sessions: studentSessions.map((s: any) => toSessionEmailItem(s)),
        })
        emails++
      } catch (emailErr) {
        console.error("STUDENT DAILY EMAIL ERROR:", emailErr)
      }
    }

    for (const [instructorId, instructorSessions] of instructorSessionMap.entries()) {
      const user = userMap.get(instructorId)
      if (!user?.email) continue
      try {
        await sendDailySessionEmail({
          to: user.email,
          name: displayName(user),
          role: "instructor",
          sessions: instructorSessions.map((s: any) => toSessionEmailItem(s)),
        })
        emails++
      } catch (emailErr) {
        console.error("INSTRUCTOR DAILY EMAIL ERROR:", emailErr)
      }
    }

    if (studentIds.length === 0) return NextResponse.json({ ok: true, sent: 0, emails })

    const subFilter = studentIds.map((id) => `student = "${id}"`).join(" || ")
    const subs = await pb.collection("push_subscriptions").getFullList({
      filter: subFilter,
    }).catch(() => [])

    let sent = 0
    for (const sub of subs) {
      const studentSessions = studentSessionMap.get(sub.student) || []
      if (studentSessions.length === 0) continue

      const firstSession = studentSessions[0]
      const sessionId = firstSession.id
      const groupTitle = firstSession.expand?.group?.title || ""
      const time = firstSession.start_time || ""
      const count = studentSessions.length

      const title = count > 1
        ? `${count} seances aujourd'hui`
        : `Seance aujourd'hui - ${groupTitle}`
      const body = count > 1
        ? studentSessions.map((s: any) => `${s.start_time} ${s.expand?.group?.title || ""}`).join(" - ")
        : `${time} - Confirmez votre presence`

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({
            title,
            body,
            url: `/student-dashboard/seance/${sessionId}`,
            sessionId,
            tag: `seance-${sessionId}`,
            actions: [
              { action: "confirm", title: "Confirmer presence" },
              { action: "dismiss", title: "Plus tard" },
            ],
          })
        )
        sent++
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pb.collection("push_subscriptions").delete(sub.id).catch(() => {})
        }
      }
    }

    return NextResponse.json({ ok: true, sent, emails })
  } catch (err: any) {
    console.error("CRON NOTIFY ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

function normalizeIds(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  return value ? [String(value)] : []
}

function displayName(user: any) {
  return [user?.name, user?.surname].filter(Boolean).join(" ") || user?.username || ""
}

function toSessionEmailItem(session: any) {
  return {
    id: session.id,
    title: session.title || "Seance de formation",
    groupTitle: session.expand?.group?.title || "",
    date: session.date?.slice(0, 10),
    startTime: session.start_time || "",
    duration: session.duration || 120,
    notes: session.notes || "",
    joinUrl: session.joinUrl || null,
  }
}

export async function GET(req: Request) {
  return runNotifications(req)
}

export async function POST(req: Request) {
  return runNotifications(req)
}
