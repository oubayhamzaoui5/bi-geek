// app/api/login/route.ts
import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

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

    return NextResponse.json({
      ok: true,
      user: {
        id: user?.id,
        username: user?.username ?? "", // built-in username (may be empty)
        email: user?.email ?? "",
        role: user?.role ?? "student",
      },
    })
  } catch (err: any) {
    console.error("LOGIN API ERROR:", err)
    return NextResponse.json(
      { error: "Erreur serveur lors de la connexion." },
      { status: 500 }
    )
  }
}
