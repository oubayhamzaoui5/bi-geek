import { NextResponse } from "next/server"
import { authErrorResponse, getAdminPb, requireUser } from "@/lib/server-auth"
import { sendPushToUsers } from "@/lib/server-push"

const ADMIN_ROLES = ["admin", "admin_agent"]

export async function POST(req: Request) {
  try {
    const user = await requireUser(req, ADMIN_ROLES)
    const pb = await getAdminPb()
    const sent = await sendPushToUsers(pb, [user.id], {
      title: "BI Geek notifications activées",
      body: "Votre téléphone peut recevoir les nouvelles inscriptions.",
      url: "/admin-mobile/enrollments",
      tag: `admin-test-${user.id}`,
      icon: "/notification-icon.png",
      requireInteraction: false,
    })

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    console.error("ADMIN TEST PUSH ERROR:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
