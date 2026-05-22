import { NextResponse } from "next/server"
import { getAdminPb } from "@/lib/server-auth"

function cleanIdentity(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const identity = cleanIdentity(body?.username ?? body?.identity)

    if (!identity) {
      return NextResponse.json({ error: "Identifiant requis." }, { status: 400 })
    }

    const pb = await getAdminPb()
    const filter = pb.filter("username = {:identity} || email = {:identity}", { identity })
    const user = await pb.collection("users").getFirstListItem(filter).catch(() => null)

    if (!user) {
      return NextResponse.json({ error: "Aucun compte ne correspond a cet identifiant." }, { status: 404 })
    }

    if (!["student", "instructor"].includes(user.role)) {
      return NextResponse.json({ error: "Ce formulaire est reserve aux etudiants et instructeurs." }, { status: 403 })
    }

    return NextResponse.json({
      ok: true,
      maskedEmail: maskEmail(user.email),
      role: user.role,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 },
    )
  }
}

function maskEmail(email: string) {
  if (!email || !email.includes("@")) return ""
  const [name, domain] = email.split("@")
  const visible = name.slice(0, Math.min(2, name.length))
  return `${visible}${"*".repeat(Math.max(name.length - visible.length, 2))}@${domain}`
}
