import { NextResponse } from "next/server"
import { randomInt } from "node:crypto"
import { sendCredentialsEmail } from "@/lib/email"
import { authErrorResponse, getAdminPb, requireUser } from "@/lib/server-auth"

function generatePassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnopqrstuvwxyz"
  const nums = "23456789"
  const symbols = "!@#$%*?"
  const all = upper + lower + nums + symbols

  const pick = (chars: string) => chars[randomInt(chars.length)]
  let pwd = pick(upper) + pick(lower) + pick(nums) + pick(symbols)

  for (let i = pwd.length; i < length; i++) {
    pwd += all[randomInt(all.length)]
  }

  const chars = pwd.split("")
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}

export async function POST(req: Request) {
  try {
    const caller = await requireUser(req, ["admin", "admin_agent"])
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "userId requis." }, { status: 400 })
    }

    const pb = await getAdminPb()
    const target = await pb.collection("users").getOne(userId)
    if (
      (caller.role === "admin" && target.role === "admin") ||
      (caller.role === "admin_agent" && ["admin", "admin_agent"].includes(target.role))
    ) {
      return NextResponse.json({ error: "Permission refusee." }, { status: 403 })
    }

    const newPassword = generatePassword()

    await pb.collection("users").update(userId, {
      password: newPassword,
      passwordConfirm: newPassword,
      plainPassword: newPassword,
      usePassword: false,
    })

    if (target.email) {
      await sendCredentialsEmail({
        to: target.email,
        username: target.username,
        password: newPassword,
        name: target.name,
        subject: "Nouveau mot de passe BI Geek",
        title: "Votre mot de passe a ete regenere",
        intro: "Un administrateur a genere un nouveau mot de passe temporaire pour votre compte.",
      }).catch((emailErr) => console.error("RESET PASSWORD EMAIL ERROR:", emailErr))
    }

    return NextResponse.json({ ok: true, plainPassword: newPassword })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 }
    )
  }
}
