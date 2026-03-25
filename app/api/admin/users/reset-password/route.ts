import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

function generatePassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnopqrstuvwxyz"
  const nums = "23456789"
  const symbols = "!@#$%*?"
  const all = upper + lower + nums + symbols

  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)]
  let pwd = pick(upper) + pick(lower) + pick(nums) + pick(symbols)

  for (let i = pwd.length; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)]
  }

  return pwd.split("").sort(() => Math.random() - 0.5).join("")
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "userId requis." }, { status: 400 })
    }

    const PB_URL = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090"
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL
    const adminPass = process.env.POCKETBASE_ADMIN_PASSWORD

    if (!adminEmail || !adminPass) {
      return NextResponse.json({ error: "Configuration serveur manquante." }, { status: 500 })
    }

    const pb = new PocketBase(PB_URL)
    await pb.collection("_superusers").authWithPassword(adminEmail, adminPass)

    const newPassword = generatePassword()

    await pb.collection("users").update(userId, {
      password: newPassword,
      passwordConfirm: newPassword,
      plainPassword: newPassword,
      usePassword: false,
    })

    return NextResponse.json({ ok: true, plainPassword: newPassword })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 }
    )
  }
}
