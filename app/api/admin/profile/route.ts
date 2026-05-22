import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { assertSelfOrRole, authErrorResponse, requireUser } from "@/lib/server-auth"

const getPB = () =>
  new PocketBase(process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

function resolveAvatar(user: any) {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  const pbUrl = process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090"
  return `${pbUrl}/api/files/${user.collectionId}/${user.id}/${user.avatar}`
}

async function adminAuth(pb: PocketBase) {
  await pb.collection("_superusers").authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "userId manquant." }, { status: 400 })
    const caller = await requireUser(req, ["admin", "admin_agent"])
    assertSelfOrRole(caller, userId)

    const pb = getPB()
    await adminAuth(pb)
    const user = await pb.collection("users").getOne(userId)

    return NextResponse.json({
      id: user.id,
      username: user.username ?? "",
      name: user.name ?? "",
      surname: user.surname ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      avatar: resolveAvatar(user),
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message ?? "Erreur serveur." }, { status: err?.status ?? 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, email, phone } = body ?? {}
    if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 })
    const caller = await requireUser(req, ["admin", "admin_agent"])
    assertSelfOrRole(caller, id)

    const pb = getPB()
    await adminAuth(pb)
    const formData = new FormData()
    if (typeof email === "string") formData.append("email", email)
    if (typeof phone === "string") formData.append("phone", phone)

    const updated = await pb.collection("users").update(id, formData)

    return NextResponse.json({
      id: updated.id,
      username: updated.username ?? "",
      name: updated.name ?? "",
      surname: updated.surname ?? "",
      email: updated.email ?? "",
      phone: updated.phone ?? "",
      avatar: resolveAvatar(updated),
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message ?? "Erreur serveur." }, { status: err?.status ?? 500 })
  }
}
