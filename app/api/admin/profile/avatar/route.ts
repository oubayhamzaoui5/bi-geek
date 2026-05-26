import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { assertSelfOrRole, authErrorResponse, requireUser } from "@/lib/server-auth"

const getPB = () =>
  new PocketBase(process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

async function adminAuth(pb: PocketBase) {
  await pb.collection("_superusers").authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const id = formData.get("id") as string
    const file = formData.get("avatar") as File | null

    if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 })
    if (!file) return NextResponse.json({ error: "Fichier avatar requis." }, { status: 400 })

    const caller = await requireUser(req, ["admin", "admin_agent"])
    assertSelfOrRole(caller, id)

    const pb = getPB()
    await adminAuth(pb)

    const fd = new FormData()
    fd.append("avatar", file)
    const updated = await pb.collection("users").update(id, fd)

    const pbUrl = process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090"
    const avatarUrl = updated.avatar
      ? `${pbUrl}/api/files/${updated.collectionId}/${updated.id}/${updated.avatar}`
      : null

    return NextResponse.json({ avatar: avatarUrl })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message ?? "Erreur serveur." }, { status: err?.status ?? 500 })
  }
}
