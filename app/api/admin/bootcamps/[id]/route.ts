// app/api/admin/bootcamps/[id]/route.ts
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
  params: { id: string }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const pb = await getAdminPb()
    const bootcampId = params.id

    const pivots = await pb.collection("bootcamp_courses").getFullList({
      filter: `bootcamp="${bootcampId}"`,
    })

    for (const p of pivots as any[]) {
      await pb.collection("bootcamp_courses").delete(p.id)
    }

    await pb.collection("bootcamps").delete(bootcampId)

    // optionnel : supprimer aussi les enrollments liés à ce bootcamp

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN BOOTCAMPS DELETE ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
