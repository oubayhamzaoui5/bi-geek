import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import webpush from "web-push"

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
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  try {
    const pb = await getAdminPb()
    const today = new Date().toISOString().slice(0, 10)

    const sessions = await pb.collection("sessions").getFullList({
      filter: `date = "${today}" && is_cancelled = false`,
      expand: "group",
      sort: "start_time",
    })

    if (sessions.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    const groupIds = [...new Set(sessions.map((s: any) => s.group))]
    const groups = await pb.collection("groups").getFullList({
      filter: groupIds.map((id) => `id = "${id}"`).join(" || "),
      fields: "id,students",
    }).catch(() => [])

    const groupStudentMap = new Map<string, string[]>(
      groups.map((g: any) => [g.id, Array.isArray(g.students) ? g.students : []])
    )

    const studentSessionMap = new Map<string, typeof sessions>()
    for (const s of sessions) {
      const students = groupStudentMap.get(s.group) || []
      for (const sid of students) {
        if (!studentSessionMap.has(sid)) studentSessionMap.set(sid, [])
        studentSessionMap.get(sid)!.push(s)
      }
    }

    const studentIds = [...studentSessionMap.keys()]
    if (studentIds.length === 0) return NextResponse.json({ ok: true, sent: 0 })

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
        ? `${count} séances aujourd'hui`
        : `Séance aujourd'hui — ${groupTitle}`
      const body = count > 1
        ? studentSessions.map((s: any) => `${s.start_time} ${s.expand?.group?.title || ""}`).join(" · ")
        : `${time} · Confirmez votre présence`

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
              { action: "confirm", title: "Confirmer présence" },
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

    return NextResponse.json({ ok: true, sent })
  } catch (err: any) {
    console.error("CRON NOTIFY ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return runNotifications(req)
}

export async function POST(req: Request) {
  return runNotifications(req)
}
