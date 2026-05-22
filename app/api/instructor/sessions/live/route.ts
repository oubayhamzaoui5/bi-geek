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

export async function POST(req: Request) {
  try {
    const { sessionId, instructorId } = await req.json()
    if (!sessionId || !instructorId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const pb = await getAdminPb()
    const session = await pb.collection("sessions").getOne(sessionId, { expand: "group" })
    
    if (session.expand?.group?.instructor !== instructorId) {
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
    const title = `${session.title || "Séance Live"} - ${session.expand?.group?.title || "Groupe"}`

    const { googleEventId, joinUrl: link } = await createMeetEvent({
      requestId: sessionId,
      title,
      date: sessionDateStr,
      startTime: sessionTimeStr,
      duration: durationMins,
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
