import { NextResponse } from "next/server"
import { getAdminPb } from "@/lib/server-auth"

type HelpRole = "student" | "instructor"

function normalizeRole(value: unknown): HelpRole | null {
  return value === "student" || value === "instructor" ? value : null
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const identity = clean(body?.identity ?? body?.username)
    const role = normalizeRole(body?.role)
    const note = clean(body?.note)

    if (!identity || !role) {
      return NextResponse.json({ error: "Identifiant et role requis." }, { status: 400 })
    }

    const pb = await getAdminPb()
    const filter = pb.filter("(username = {:identity} || email = {:identity}) && role = {:role}", { identity, role })
    const user = await pb.collection("users").getFirstListItem(filter).catch(() => null)

    if (!user) {
      return NextResponse.json({ error: "Compte introuvable pour ce role." }, { status: 404 })
    }

    const openFilter = pb.filter("user = {:userId} && status = 'open'", { userId: user.id })
    const existing = await pb.collection("password_reset_requests").getFirstListItem(openFilter).catch(() => null)

    const payload = {
      user: user.id,
      role,
      status: "open",
      method: "email_code_failed",
      phone_snapshot: user.phone ?? "",
      note: note || "L'utilisateur indique que le code email n'a pas fonctionne.",
    }

    if (existing) {
      await pb.collection("password_reset_requests").update(existing.id, payload)
      return NextResponse.json({ ok: true, requestId: existing.id, duplicate: true })
    }

    const created = await pb.collection("password_reset_requests").create(payload)
    return NextResponse.json({ ok: true, requestId: created.id })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 },
    )
  }
}
