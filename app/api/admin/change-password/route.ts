import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { AUTH_COOKIE, assertSelfOrRole, authErrorResponse, cookieOptions, requireUser } from "@/lib/server-auth"

const getPB = () =>
  new PocketBase(process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

function resolveAvatar(user: any, pbUrl: string) {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  return `${pbUrl}/api/files/${user.collectionId}/${user.id}/${user.avatar}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, currentPassword, newPassword, newPasswordConfirm } = body ?? {}

    if (!userId || !newPassword || !newPasswordConfirm)
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 })

    if (newPassword !== newPasswordConfirm)
      return NextResponse.json({ error: "La confirmation ne correspond pas." }, { status: 400 })
    const caller = await requireUser(req, ["admin", "admin_agent"])
    assertSelfOrRole(caller, userId)

    const pb = getPB()
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL
    const adminPass = process.env.POCKETBASE_ADMIN_PASSWORD

    if (!adminEmail || !adminPass)
      return NextResponse.json({ error: "Configuration serveur manquante." }, { status: 500 })

    try {
      await pb.collection("_superusers").authWithPassword(adminEmail, adminPass)
    } catch {
      return NextResponse.json({ error: "Erreur d'authentification serveur." }, { status: 500 })
    }

    let userRecord: any
    try {
      userRecord = await pb.collection("users").getOne(userId)
    } catch {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 })
    }

    const hasPassword = !!userRecord.usePassword

    if (hasPassword) {
      const identity = userRecord.email || userRecord.username
      const verifyPb = getPB()
      try {
        await verifyPb.collection("users").authWithPassword(identity, currentPassword)
      } catch {
        return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 })
      }

      const updatePayload: Record<string, unknown> = {
        password: newPassword,
        passwordConfirm: newPasswordConfirm,
        oldPassword: currentPassword,
        usePassword: true,
        emailVisibility: true,
      }
      if (typeof userRecord.plainPassword !== "undefined") updatePayload.plainPassword = ""
      await pb.collection("users").update(userId, updatePayload)
    } else {
      const updatePayload: Record<string, unknown> = {
        password: newPassword,
        passwordConfirm: newPasswordConfirm,
        usePassword: true,
        emailVisibility: true,
      }
      if (typeof userRecord.plainPassword !== "undefined") updatePayload.plainPassword = ""
      await pb.collection("users").update(userId, updatePayload)
    }

    const impersonatedPb = await pb.collection("users").impersonate(userId, 60 * 60 * 24 * 7)
    const refreshedUser = impersonatedPb.authStore.record
    if (!refreshedUser) {
      return NextResponse.json({ error: "Connexion introuvable apres changement du mot de passe." }, { status: 500 })
    }

    const pbUrl = process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090"
    const res = NextResponse.json({
      ok: true,
      user: {
        id: refreshedUser.id,
        username: refreshedUser.username ?? "",
        email: refreshedUser.email ?? "",
        role: refreshedUser.role ?? "admin",
        usePassword: refreshedUser.usePassword ?? true,
        avatar: resolveAvatar(refreshedUser, pbUrl),
      },
    })
    if (impersonatedPb.authStore.token) {
      res.cookies.set(AUTH_COOKIE, impersonatedPb.authStore.token, cookieOptions())
    }
    return res
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message ?? "Erreur serveur." }, { status: err?.status ?? 500 })
  }
}
