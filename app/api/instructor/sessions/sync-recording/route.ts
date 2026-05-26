import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { google } from "googleapis"

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

export async function POST(req: Request) {
  try {
    const { sessionId, instructorId } = await req.json()
    if (!sessionId || !instructorId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const pb = await getAdminPb()
    const session = await pb.collection("sessions").getOne(sessionId, { expand: "group" })
    
    if (!groupInstructorIds(session.expand?.group).includes(instructorId)) {
      return NextResponse.json({ error: "Unauthorized access to this group" }, { status: 403 })
    }

    if (!session.googleEventId) {
      return NextResponse.json({ error: "Cet événement n'a pas été généré via la plateforme, impossible de synchroniser" }, { status: 400 })
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      // Mock mode for testing since user doesn't have pro email setup yet
      console.warn("⚠️ Google Credentials missing: MOCKING recording synchronization.")
      const mockRecordingUrl = `https://drive.google.com/file/d/mock-${Math.random().toString(36).substring(2, 6)}-test/view`
      await pb.collection("sessions").update(sessionId, { recordingUrl: mockRecordingUrl })
      return NextResponse.json({ ok: true, recordingUrl: mockRecordingUrl })
    }

    // Authenticate with Google API
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      subject: process.env.GOOGLE_WORKSPACE_IMPERSONATE_EMAIL
    })

    const calendar = google.calendar({ version: "v3", auth })

    try {
      const res = await calendar.events.get({
        calendarId: "primary",
        eventId: session.googleEventId,
      })

      const attachments = res.data.attachments || []
      // Usually, google meet recordings are stored as video/mp4 MIME types on drive
      const videoAttachment = attachments.find((a) => a.mimeType?.includes("video"))

      if (!videoAttachment || !videoAttachment.fileUrl) {
        return NextResponse.json({ error: "L'enregistrement est introuvable. Google le traite encore ou il n'a pas été démarré." }, { status: 404 })
      }

      const recordingUrl = videoAttachment.fileUrl

      // Save safely unto pocketbase
      await pb.collection("sessions").update(sessionId, { recordingUrl })

      return NextResponse.json({ ok: true, recordingUrl })

    } catch (gErr: any) {
      console.error("Google Calendar Get Error:", gErr)
      return NextResponse.json({ error: "Ã‰chec de communication avec Google Calendar" }, { status: 500 })
    }

  } catch (err: any) {
    console.error("SYNC RECORDING ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
