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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const pb = await getAdminPb()
    await pb.collection("groups").delete(params.id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN GROUPS DELETE ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
