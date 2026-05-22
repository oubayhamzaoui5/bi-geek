import { google } from "googleapis"

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary"
const TIMEZONE    = process.env.GOOGLE_CALENDAR_TIMEZONE || "Africa/Algiers"

function getClient() {
  const missing = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
  ].filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Configuration Google Calendar manquante: ${missing.join(", ")}`)
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return google.calendar({ version: "v3", auth })
}

function pad(n: number) { return String(n).padStart(2, "0") }

function toLocalISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

function buildStartEnd(date: string, startTime: string, duration: number) {
  const [y, m, d] = date.split("-").map(Number)
  const [h, min]  = (startTime || "09:00").split(":").map(Number)
  const start     = new Date(y, m - 1, d, h, min)
  const end       = new Date(start.getTime() + duration * 60_000)
  return {
    start: { dateTime: toLocalISO(start), timeZone: TIMEZONE },
    end:   { dateTime: toLocalISO(end),   timeZone: TIMEZONE },
  }
}

export async function createMeetEvent(opts: {
  requestId: string
  title:     string
  date:      string
  startTime: string
  duration:  number
}) {
  const cal = getClient()
  const { start, end } = buildStartEnd(opts.date, opts.startTime, opts.duration)

  const res = await cal.events.insert({
    calendarId:            CALENDAR_ID,
    conferenceDataVersion: 1,
    requestBody: {
      summary: opts.title || "Séance de formation",
      start,
      end,
      conferenceData: {
        createRequest: {
          requestId:           opts.requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  })

  const joinUrl =
    res.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === "video")?.uri ??
    res.data.hangoutLink ??
    null

  return { googleEventId: res.data.id ?? null, joinUrl }
}

export async function updateMeetEvent(opts: {
  googleEventId: string
  title?:        string
  date?:         string
  startTime?:    string
  duration?:     number
}) {
  const cal   = getClient()
  const patch: any = {}

  if (opts.title) patch.summary = opts.title

  if (opts.date || opts.startTime || opts.duration) {
    const existing = await cal.events.get({ calendarId: CALENDAR_ID, eventId: opts.googleEventId })
    const exStart  = existing.data.start?.dateTime ?? ""
    const exEnd    = existing.data.end?.dateTime   ?? ""
    const exDur    = exStart && exEnd
      ? (new Date(exEnd).getTime() - new Date(exStart).getTime()) / 60_000
      : 120

    const date  = opts.date      ?? exStart.slice(0, 10)
    const time  = opts.startTime ?? exStart.slice(11, 16)
    const dur   = opts.duration  ?? exDur
    const { start, end } = buildStartEnd(date, time, dur)
    patch.start = start
    patch.end   = end
  }

  await cal.events.patch({ calendarId: CALENDAR_ID, eventId: opts.googleEventId, requestBody: patch })
}

export async function deleteMeetEvent(googleEventId: string) {
  try {
    const cal = getClient()
    await cal.events.delete({ calendarId: CALENDAR_ID, eventId: googleEventId })
  } catch {
    // already deleted or not found — ignore
  }
}
