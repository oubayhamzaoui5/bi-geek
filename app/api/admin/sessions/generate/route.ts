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

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function nextDate(date: string) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return toYMD(d)
}

// POST — generate session records for a group from its schedule+period
// Skips dates that already have a session record for that slot.
// Never touches past sessions that already exist.
export async function POST(req: Request) {
  try {
    const { groupId } = await req.json()
    if (!groupId) {
      return NextResponse.json({ error: "groupId requis." }, { status: 400 })
    }

    const pb = await getAdminPb()

    // Fetch group
    const group = await pb.collection("groups").getOne(groupId)

    const schedules: { day: string; start_time: string; duration: number }[] = (() => {
      const raw = group.schedules
      if (!raw) return []
      if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return [] } }
      if (Array.isArray(raw)) return raw
      return []
    })()

    if (schedules.length === 0) {
      return NextResponse.json({ ok: true, created: 0, message: "Aucune séance définie." })
    }

    const startDateStr = group.schedule_start_date?.slice(0, 10)
    const endDateStr = group.schedule_end_date?.slice(0, 10)

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ ok: true, created: 0, message: "Période non définie." })
    }

    const start = new Date(startDateStr + "T12:00:00")
    const end = new Date(endDateStr + "T12:00:00")

    if (start > end) {
      return NextResponse.json({ error: "Date de début après date de fin." }, { status: 400 })
    }

    // Fetch all existing sessions for this group in the period
    const existing = await pb.collection("sessions").getFullList({
      filter: `group = "${groupId}" && date >= "${startDateStr}" && date < "${nextDate(endDateStr)}"`,
    })

    // Build a set of "date|start_time" keys for existing sessions so we never overwrite them
    const existingKeys = new Set<string>(
      (existing as any[]).map(s => `${s.date.slice(0, 10)}|${s.start_time || ""}`)
    )

    // Walk every calendar day in the period and create missing session records
    const toCreate: any[] = []
    const current = new Date(start)
    while (current <= end) {
      const dayName = DAY_NAMES[current.getDay()]
      const ymd = toYMD(current)
      for (const slot of schedules) {
        if (slot.day === dayName) {
          const key = `${ymd}|${slot.start_time || ""}`
          if (!existingKeys.has(key)) {
            toCreate.push({
              group: groupId,
              date: ymd,
              start_time: slot.start_time || "",
              duration: slot.duration || 120,
              mode: "live_presentiel",
              is_cancelled: false,
            })
          }
        }
      }
      current.setDate(current.getDate() + 1)
    }

    // Create records one by one (PocketBase has no bulk create)
    let created = 0
    for (const data of toCreate) {
      await pb.collection("sessions").create(data)
      created++
    }

    return NextResponse.json({ ok: true, created })
  } catch (err: any) {
    console.error("ADMIN SESSIONS GENERATE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
