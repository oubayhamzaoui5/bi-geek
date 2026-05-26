import { NextResponse } from "next/server"
import { sendUsernameReminderEmail } from "@/lib/email"
import { getAdminPb } from "@/lib/server-auth"

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = cleanEmail(body?.email)

    if (!email) {
      return NextResponse.json({ error: "Email requis." }, { status: 400 })
    }

    const pb = await getAdminPb()
    const users = await pb.collection("users").getFullList({
      filter: pb.filter("email = {:email}", { email }),
      fields: "username,name,surname,role,email",
    }).catch(() => [])

    if (users.length > 0) {
      await sendUsernameReminderEmail({
        to: email,
        users: users
          .filter((user: any) => user.username)
          .map((user: any) => ({
            username: user.username,
            name: user.name,
            surname: user.surname,
            role: roleLabel(user.role),
          })),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("FORGOT USERNAME ERROR:", err?.response ?? err?.data ?? err)
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 },
    )
  }
}

function roleLabel(role: unknown) {
  if (role === "student") return "Apprenant"
  if (role === "instructor") return "Formateur"
  if (role === "admin_agent") return "Agent administratif"
  if (role === "admin") return "Administrateur"
  return typeof role === "string" ? role : ""
}
