import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

export async function GET() {
  try {
    const PB_URL = process.env.POCKETBASE_URL
    const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
    const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

    if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Variables d'environnement PocketBase manquantes." },
        { status: 500 },
      )
    }

    const pb = new PocketBase(PB_URL)
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)

    const [courses, bootcamps, enrollments] = await Promise.all([
      pb.collection("courses").getFullList({ sort: "title" }),
      pb.collection("bootcamps").getFullList({ sort: "title" }),
      pb.collection("enrollments").getFullList(),
    ])

    const courseCounts = new Map<string, number>()
    const bootcampCounts = new Map<string, number>()

    for (const e of enrollments as any[]) {
      if (e.course) {
        courseCounts.set(e.course, (courseCounts.get(e.course) ?? 0) + 1)
      }
      if (e.bootcamp) {
        bootcampCounts.set(e.bootcamp, (bootcampCounts.get(e.bootcamp) ?? 0) + 1)
      }
    }

    const courseResult = (courses as any[]).map((c) => ({
      id: c.id,
      title: c.title,
      enrollmentsCount: courseCounts.get(c.id) ?? 0,
    }))

    const bootcampResult = (bootcamps as any[]).map((b) => ({
      id: b.id,
      title: b.title,
      enrollmentsCount: bootcampCounts.get(b.id) ?? 0,
    }))

    return NextResponse.json({
      ok: true,
      courses: courseResult,
      bootcamps: bootcampResult,
    })
  } catch (err: any) {
    console.error("ADMIN OVERVIEW ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
