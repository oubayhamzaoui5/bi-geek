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
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const pb = await getAdminPb()
    const { id: bootcampId } = await params
    const body = await req.json()

    if (body.action === "restore") {
      await pb.collection("bootcamps").update(bootcampId, { archived: false })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
  } catch (err: any) {
    console.error("ADMIN BOOTCAMPS PATCH ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const pb = await getAdminPb()
    const { id: bootcampId } = await params
    const { searchParams } = new URL(req.url)
    const permanent = searchParams.get("permanent") === "true"

    if (!permanent) {
      // Soft delete — archive
      await pb.collection("bootcamps").update(bootcampId, { archived: true })
      return NextResponse.json({ ok: true })
    }

    // Permanent delete — cascade pivots
    const pivots = await pb.collection("bootcamp_courses").getFullList({
      filter: `bootcamp="${bootcampId}"`,
    })
    for (const p of pivots as any[]) {
      await pb.collection("bootcamp_courses").delete(p.id)
    }
    await pb.collection("bootcamps").delete(bootcampId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN BOOTCAMPS DELETE ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
