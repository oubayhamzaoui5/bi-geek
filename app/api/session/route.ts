import { NextResponse } from "next/server"
import { authErrorResponse, getAdminPb, getRequestUser } from "@/lib/server-auth"

function resolveAvatar(user: any, pbUrl: string) {
  if (!user?.avatar) return null
  if (typeof user.avatar === "string" && user.avatar.startsWith("http")) return user.avatar
  return `${pbUrl}/api/files/${user.collectionId}/${user.id}/${user.avatar}`
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getRequestUser(req)
    const pb = await getAdminPb()
    const user = await pb.collection("users").getOne(sessionUser.id)
    const pbUrl = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090"

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username ?? sessionUser.username ?? "",
        email: user.email ?? sessionUser.email ?? "",
        role: user.role ?? sessionUser.role ?? "student",
        usePassword: user.usePassword ?? sessionUser.usePassword ?? false,
        avatar: resolveAvatar(user, pbUrl),
      },
    })
  } catch (err) {
    const authResponse = authErrorResponse(err)
    if (authResponse) return authResponse
    console.error("SESSION API ERROR:", err)
    return NextResponse.json({ error: "Erreur serveur lors de la session." }, { status: 500 })
  }
}
