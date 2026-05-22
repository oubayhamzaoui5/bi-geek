import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    if (!studentId) {
      return NextResponse.json({ error: "studentId requis." }, { status: 400 })
    }

    const pb = await getAdminPb()
    const today = new Date().toISOString().slice(0, 10)

    // Get groups where student is enrolled
    const groups = await pb.collection("groups").getFullList({
      filter: `students ?~ "${studentId}"`,
      fields: "id,title",
    }).catch(() => [])

    if (groups.length === 0) return NextResponse.json({ sessions: [] })

    const groupIds = groups.map((g: any) => g.id)
    const groupMap = new Map(groups.map((g: any) => [g.id, g.title]))

    // Get today's non-cancelled sessions for those groups
    const groupFilter = groupIds.map((id: string) => `group = "${id}"`).join(" || ")
    const sessions = await pb.collection("sessions").getFullList({
      filter: `date = "${today}" && is_cancelled = false && (${groupFilter})`,
      sort: "start_time",
    })

    return NextResponse.json({
      sessions: sessions.map((s: any) => ({
        id: s.id,
        group: s.group,
        groupTitle: groupMap.get(s.group) || "",
        date: s.date.slice(0, 10),
        start_time: s.start_time || "",
        duration: s.duration || 120,
        mode: s.mode || "live_presentiel",
        title: s.title || null,
        joinUrl: s.joinUrl || null,
      })),
    })
  } catch (err: any) {
    console.error("STUDENT SESSIONS TODAY ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
