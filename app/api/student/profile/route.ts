import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

const getPB = () =>
  new PocketBase(process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

/** GET /api/student/profile?userId=<id> */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "userId manquant." }, { status: 400 })
    }

    const pb = getPB()
    const user = await pb.collection("users").getOne(userId)

    return NextResponse.json({
      id: user.id,
      username: user.username ?? "",
      name: user.name ?? "",
      surname: user.surname ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      avatar: user.avatar ?? null,
    })
  } catch (err: any) {
    console.error("GET /api/student/profile error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 }
    )
  }
}

/** PATCH /api/student/profile  – update editable fields */
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, email, phone } = body ?? {}

    if (!id) {
      return NextResponse.json({ error: "id manquant." }, { status: 400 })
    }

    const pb = getPB()
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
    })
  } catch (err: any) {
    console.error("PATCH /api/student/profile error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 }
    )
  }
}
