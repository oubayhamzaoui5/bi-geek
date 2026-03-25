import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const PB_URL = process.env.POCKETBASE_URL
  const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
  const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

  if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Variables d'environnement PocketBase manquantes.")
  }

  const pb = new PocketBase(PB_URL)
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  return pb
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const pb = await getAdminPb()
    const { id: courseId } = await params

    const modules = await pb.collection("course_modules").getFullList({
      filter: `course="${courseId}"`,
      sort: "order",
    })

    const lessons = await pb.collection("course_lessons").getFullList({
      filter: `course="${courseId}"`,
      sort: "order",
    })

    return NextResponse.json({
      ok: true,
      curriculum: {
        modules: modules.map((m: any) => ({
          id: m.id,
          title: m.title,
          locked: !!m.locked,
        })),
        lessons: lessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          moduleId: l.module,
          locked: !!l.locked,
        })),
      },
    })
  } catch (err: any) {
    console.error("ADMIN CURRICULUM GET ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
