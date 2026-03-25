// app/api/admin/enrollments/[id]/route.ts
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

type EnrollmentStatus = "pending" | "contacted" | "confirmed"

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const pb = await getAdminPb()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const status = body.status as EnrollmentStatus | undefined

    if (!status || !["pending", "contacted", "confirmed"].includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide (pending, contacted, confirmed)." },
        { status: 400 },
      )
    }

    await pb.collection("enrollments").update(id, { status })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN ENROLLMENTS PATCH ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const pb = await getAdminPb()
    const { id } = await params
    await pb.collection("enrollments").delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN ENROLLMENTS DELETE ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
