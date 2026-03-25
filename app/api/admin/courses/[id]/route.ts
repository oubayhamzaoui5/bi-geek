// app/api/admin/courses/[id]/route.ts
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

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const pb = await getAdminPb()
    const { id: courseId } = await params

    // Delete lessons inside modules
    const modules = await pb.collection("course_modules").getFullList({
      filter: `course="${courseId}"`,
    })

    for (const m of modules as any[]) {
      const lessons = await pb.collection("course_lessons").getFullList({
        filter: `module="${m.id}"`,
      })
      for (const l of lessons as any[]) {
        await pb.collection("course_lessons").delete(l.id)
      }
      await pb.collection("course_modules").delete(m.id)
    }

    // Delete the course
    await pb.collection("courses").delete(courseId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN COURSES DELETE ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}