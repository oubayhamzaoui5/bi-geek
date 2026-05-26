import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { getAdminPb } from "@/lib/server-auth"

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function hashCode(code: string) {
  return createHash("sha256").update(`${code}:${process.env.CRON_SECRET || "bi-geek"}`).digest("hex")
}

type ResetCodeNote = {
  codeHash: string
  expiresAt: string
  attempts: number
}

function parseResetCodeNote(note: unknown): ResetCodeNote | null {
  if (typeof note !== "string" || !note.startsWith("RESET_CODE:")) return null
  try {
    const parsed = JSON.parse(note.slice("RESET_CODE:".length))
    if (!parsed?.codeHash || !parsed?.expiresAt) return null
    return {
      codeHash: String(parsed.codeHash),
      expiresAt: String(parsed.expiresAt),
      attempts: Number(parsed.attempts || 0),
    }
  } catch {
    return null
  }
}

function serializeResetCodeNote(note: ResetCodeNote) {
  return `RESET_CODE:${JSON.stringify(note)}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const identity = clean(body?.identity ?? body?.username)
    const code = clean(body?.code).replace(/\s/g, "")
    const password = clean(body?.password)
    const passwordConfirm = clean(body?.passwordConfirm)

    if (!identity || !code || !password || !passwordConfirm) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 })
    }

    if (password !== passwordConfirm) {
      return NextResponse.json({ error: "La confirmation ne correspond pas." }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caracteres." }, { status: 400 })
    }

    const pb = await getAdminPb()
    const userFilter = pb.filter("username = {:identity} || email = {:identity}", { identity })
    const user = await pb.collection("users").getFirstListItem(userFilter).catch(() => null)

    if (!user || !["student", "instructor"].includes(user.role)) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 })
    }

    const result = await pb.collection("password_reset_requests").getList(1, 100, {
      sort: "-created",
    }).catch((err: any) => {
      console.error("RESET PASSWORD - DB query error:", err?.response ?? err?.data ?? err?.message ?? err)
      return null
    })
    if (!result) {
      return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
    }
    const requests = result.items.filter((r: any) => r.user === user.id && r.status === "open")

    const latest = requests.find((request: any) => parseResetCodeNote(request.note))
    const resetNote = parseResetCodeNote(latest?.note)
    if (!latest || !resetNote) {
      return NextResponse.json({ error: "Code invalide ou expire." }, { status: 400 })
    }

    if (new Date(resetNote.expiresAt).getTime() < Date.now()) {
      await pb.collection("password_reset_requests").update(latest.id, { status: "resolved", resolved_at: new Date().toISOString() }).catch(() => {})
      return NextResponse.json({ error: "Code expire. Demandez un nouveau code." }, { status: 400 })
    }

    if (resetNote.attempts >= 5) {
      await pb.collection("password_reset_requests").update(latest.id, { status: "resolved", resolved_at: new Date().toISOString() }).catch(() => {})
      return NextResponse.json({ error: "Trop de tentatives. Demandez un nouveau code." }, { status: 429 })
    }

    if (resetNote.codeHash !== hashCode(code)) {
      await pb.collection("password_reset_requests").update(latest.id, {
        note: serializeResetCodeNote({ ...resetNote, attempts: resetNote.attempts + 1 }),
      }).catch(() => {})
      return NextResponse.json({ error: "Code incorrect." }, { status: 400 })
    }

    await pb.collection("users").update(user.id, {
      password,
      passwordConfirm,
      plainPassword: password,
      usePassword: true,
      emailVisibility: true,
    })

    await pb.collection("password_reset_requests").update(latest.id, {
      status: "resolved",
      resolved_at: new Date().toISOString(),
      note: "Mot de passe reinitialise par code email.",
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 },
    )
  }
}
