import { NextResponse } from "next/server"
import { getAdminPb } from "@/lib/server-auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pb = await getAdminPb()
    const today = new Date().toISOString().slice(0, 10)

    const result = await pb.collection("sessions").getList(1, 1, {
      filter: `group = "${id}" && date >= "${today}" && is_cancelled = false`,
      sort: "date,start_time",
    })

    if (result.items.length === 0) return NextResponse.json({ ok: true, session: null })

    const s = result.items[0]
    return NextResponse.json({
      ok: true,
      session: {
        id: s.id,
        date: (s.date as string).slice(0, 10),
        start_time: (s.start_time as string) || "",
        duration: (s.duration as number) || 120,
        title: (s.title as string) || null,
        joinUrl: (s.joinUrl as string) || null,
      },
    })
  } catch (err: any) {
    console.error("INSTRUCTOR NEXT SESSION ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
