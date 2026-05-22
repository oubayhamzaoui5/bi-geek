import { NextResponse } from "next/server"
import { authErrorResponse, getAdminPb, requireUser } from "@/lib/server-auth"

const PB_URL = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090"

function resolveAvatar(user: any): string | null {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  return `${PB_URL}/api/files/${user.collectionId}/${user.id}/${user.avatar}`
}

export async function GET(req: Request) {
  try {
    await requireUser(req, ["admin", "admin_agent"])
    const pb = await getAdminPb()
    const records = await pb.collection("password_reset_requests").getFullList({
      filter: "status = 'open'",
      expand: "user",
    })
    records.sort((a: any, b: any) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime())

    return NextResponse.json({
      notifications: records.map((record: any) => {
        const user = record.expand?.user
        return {
          id: record.id,
          created: record.created,
          status: record.status,
          method: record.method,
          note: record.note ?? "",
          user: user ? {
            id: user.id,
            name: user.name ?? "",
            surname: user.surname ?? "",
            username: user.username ?? "",
            email: user.email ?? "",
            phone: user.phone ?? record.phone_snapshot ?? "",
            role: user.role ?? record.role,
            avatar: resolveAvatar(user),
          } : null,
        }
      }),
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message ?? "Erreur serveur." }, { status: err?.status ?? 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    await requireUser(req, ["admin", "admin_agent"])
    const { id, status } = await req.json().catch(() => ({}))
    if (!id || status !== "resolved") {
      return NextResponse.json({ error: "Requete invalide." }, { status: 400 })
    }

    const pb = await getAdminPb()
    await pb.collection("password_reset_requests").update(id, {
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message ?? "Erreur serveur." }, { status: err?.status ?? 500 })
  }
}
