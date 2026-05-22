// app/api/login/route.ts
import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { AUTH_COOKIE, cookieOptions } from "@/lib/server-auth"

function resolveAvatar(user: any, pbUrl: string) {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  return `${pbUrl}/api/files/${user.collectionId}/${user.id}/${user.avatar}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { username, password } = body ?? {}

    if (!username || !password) {
      return NextResponse.json(
        { error: "Nom d'utilisateur ou mot de passe manquant." },
        { status: 400 }
      )
    }

    const PB_URL = process.env.POCKETBASE_URL
    if (!PB_URL) {
      return NextResponse.json(
        { error: "POCKETBASE_URL manquant dans les variables d'environnement." },
        { status: 500 }
      )
    }

    const pb = new PocketBase(PB_URL)

    let authData

    try {
      // 1) Try directly (if you later enable built-in username or login by email)
      authData = await pb.collection("users").authWithPassword(username, password)
    } catch {
      // 2) Fallback: find user by CUSTOM "username" field, then auth using email or id
      try {
        const userRecord = await pb
          .collection("users")
          .getFirstListItem(`username="${username}"`) // <-- custom schema field

        // use email or id as identity (both are valid)
        const identity = userRecord.email || userRecord.id

        authData = await pb.collection("users").authWithPassword(identity, password)
      } catch (err2: any) {
        console.error("PB auth error (with custom username):", err2?.data || err2)
        return NextResponse.json(
          { error: "Identifiants invalides." },
          { status: 401 }
        )
      }
    }

    const user = authData?.record

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user?.id,
        username: user?.username ?? "",
        email: user?.email ?? "",
        role: user?.role ?? "student",
        usePassword: user?.usePassword ?? false,
        avatar: resolveAvatar(user, PB_URL),
      },
    })
    if (authData?.token) {
      res.cookies.set(AUTH_COOKIE, authData.token, cookieOptions())
    }
    return res
  } catch (err: any) {
    console.error("LOGIN API ERROR:", err)
    return NextResponse.json(
      { error: "Erreur serveur lors de la connexion." },
      { status: 500 }
    )
  }
}
