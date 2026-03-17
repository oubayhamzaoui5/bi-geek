import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

type SessionRecord = {
  id: string
  title?: string
  name?: string
  date?: string
  startDate?: string
  time?: string
  startTime?: string
  durationMin?: number
  duration?: number
  instructor?: string
  teacher?: string
  joinUrl?: string
  link?: string
  isLive?: boolean
}

type AnnouncementRecord = {
  id: string
  title?: string
  date?: string
  course?: string
  author?: string
  href?: string
}

const safeList = async <T>(
  pb: PocketBase,
  collection: string,
  options?: Record<string, unknown>,
): Promise<T[]> => {
  try {
    return (await pb.collection(collection).getFullList(options)) as T[]
  } catch {
    return []
  }
}

export async function GET() {
  const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? process.env.POCKETBASE_URL

  if (!PB_URL) {
    return NextResponse.json({ sessions: [], announcements: [] })
  }

  try {
    const pb = new PocketBase(PB_URL)

    const [sessionsRaw, announcementsRaw] = await Promise.all([
      safeList<SessionRecord>(pb, "sessions", { sort: "date" }),
      safeList<AnnouncementRecord>(pb, "announcements", { sort: "-created" }),
    ])

    const sessions = sessionsRaw
      .map((s) => ({
        id: s.id,
        title: s.title ?? s.name ?? "Session",
        date: s.date ?? s.startDate ?? "",
        time: s.time ?? s.startTime ?? "00:00",
        durationMin: s.durationMin ?? s.duration,
        instructor: s.instructor ?? s.teacher ?? "Equipe pÃ©dagogique",
        joinUrl: s.joinUrl ?? s.link,
        isLive: s.isLive ?? false,
      }))
      .filter((s) => s.date)

    const announcements = announcementsRaw.map((a) => ({
      id: a.id,
      title: a.title ?? "Annonce",
      date: a.date ?? new Date().toISOString(),
      course: a.course,
      author: a.author,
      href: a.href,
    }))

    return NextResponse.json({ sessions, announcements })
  } catch (err) {
    console.error("STUDENT DASHBOARD API ERROR:", err)
    return NextResponse.json({ sessions: [], announcements: [] })
  }
}
