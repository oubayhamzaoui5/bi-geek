// app/api/admin/instructors/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import PocketBase from "pocketbase"

/* ---------- PocketBase admin helper ---------- */

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

type RouteContext = {
  params: { id: string }
}

/* ---------- DELETE: remove one instructor ---------- */
/*
Request: DELETE /api/admin/instructors/:id
Response: { ok: true }
*/

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: "Identifiant formateur manquant." },
      { status: 400 },
    )
  }

  try {
    const pb = await getAdminPb()

    await pb.collection("instructors").delete(id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error(
      "ADMIN INSTRUCTORS DELETE ERROR:",
      err?.data ? JSON.stringify(err.data, null, 2) : err,
    )

    const status = err?.status ?? 500
    const baseMsg =
      err?.data?.message || err?.message || "Erreur lors de la suppression du formateur."

    if (status === 404) {
      return NextResponse.json(
        { error: "Formateur introuvable." },
        { status: 404 },
      )
    }

    return NextResponse.json({ error: baseMsg }, { status: 500 })
  }
}
