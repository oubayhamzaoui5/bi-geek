import { NextResponse } from "next/server"
import { createHash, randomInt } from "node:crypto"
import { sendPasswordResetCodeEmail } from "@/lib/email"
import { getAdminPb } from "@/lib/server-auth"

function cleanIdentity(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function generateCode() {
  return String(randomInt(100000, 1000000))
}

function hashCode(code: string) {
  return createHash("sha256").update(`${code}:${process.env.CRON_SECRET || "bi-geek"}`).digest("hex")
}

function resetCodeNote(code: string) {
  return `RESET_CODE:${JSON.stringify({
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    attempts: 0,
  })}`
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
      return NextResponse.json({ error: "Ce formulaire est reserve aux apprenants et formateurs." }, { status: 403 })
    }

    if (!user.email) {
      return NextResponse.json({ error: "Aucun email n'est associe a ce compte." }, { status: 400 })
    }

    const code = generateCode()
    const payload = {
      user: user.id,
      role: user.role,
      status: "open",
      method: "email_code_failed",
      phone_snapshot: user.phone ?? "",
      note: resetCodeNote(code),
    }
    try {
      await pb.collection("password_reset_requests").create(payload)
    } catch (dbErr: any) {
      console.error("FORGOT PASSWORD DB ERROR:", dbErr?.response ?? dbErr?.data ?? dbErr?.message ?? dbErr)
      return NextResponse.json(
        { error: dbErr?.message ?? "Impossible de preparer le code." },
        { status: dbErr?.status ?? 500 },
      )
    }

    try {
      await sendPasswordResetCodeEmail({
        to: user.email,
        name: user.name,
        code,
      })
    } catch (emailErr: any) {
      console.error("FORGOT PASSWORD EMAIL ERROR:", emailErr?.response ?? emailErr?.message ?? emailErr)
      return NextResponse.json(
        { error: emailErr?.message ?? "Impossible d'envoyer l'email." },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      maskedEmail: maskEmail(user.email),
      role: user.role,
    })
  } catch (err: any) {
    console.error("FORGOT PASSWORD ERROR:", err?.response ?? err?.data ?? err)
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
