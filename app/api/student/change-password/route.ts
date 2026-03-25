import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

const getPB = () =>
  new PocketBase(process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

/**
 * POST /api/student/change-password
 * Body: { userId, currentPassword, newPassword, newPasswordConfirm }
 *
 * Handles two scenarios:
 *  A) User already has a password (usePassword === true):
 *       - Verify the current password via authWithPassword.
 *       - Update with oldPassword + new password.
 *  B) User has NO password yet (usePassword === false, e.g. created via admin):
 *       - Authenticate as admin/superuser.
 *       - Set the password directly (no oldPassword needed).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, currentPassword, newPassword, newPasswordConfirm } = body ?? {}

    if (!userId || !newPassword || !newPasswordConfirm) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 })
    }

    if (newPassword !== newPasswordConfirm) {
      return NextResponse.json({ error: "La confirmation ne correspond pas." }, { status: 400 })
    }

    const pb = getPB()

    // Authenticate as admin to fetch the full user record (email is hidden for unauthenticated requests)
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL
    const adminPass = process.env.POCKETBASE_ADMIN_PASSWORD

    if (!adminEmail || !adminPass) {
      return NextResponse.json(
        { error: "Configuration serveur manquante." },
        { status: 500 }
      )
    }

    try {
      await pb.collection("_superusers").authWithPassword(adminEmail, adminPass)
    } catch {
      return NextResponse.json({ error: "Erreur d'authentification serveur." }, { status: 500 })
    }

    // 1. Fetch the user record (now with admin auth so email is visible)
    let userRecord: any
    try {
      userRecord = await pb.collection("users").getOne(userId)
    } catch {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 })
    }

    const hasPassword = !!userRecord.usePassword

    if (hasPassword) {
      // ── Scenario A: user already has a password ──
      // Verify the current password by authenticating with a fresh PB instance
      const identity = userRecord.email || userRecord.username
      const verifyPb = getPB()
      try {
        await verifyPb.collection("users").authWithPassword(identity, currentPassword)
      } catch {
        return NextResponse.json(
          { error: "Mot de passe actuel incorrect." },
          { status: 401 }
        )
      }

      // Update with oldPassword (PB verifies it server-side)
      const updatePayload: Record<string, unknown> = {
        password: newPassword,
        passwordConfirm: newPasswordConfirm,
        oldPassword: currentPassword,
        usePassword: true,
        emailVisibility: true,
      }

      // Clear plainPassword since the real password is now hashed in PB
      if (typeof userRecord.plainPassword !== "undefined") {
        updatePayload.plainPassword = ""
      }

      try {
        await pb.collection("users").update(userId, updatePayload)
      } catch (pbErr: any) {
        console.error("PB update error details:", JSON.stringify(pbErr?.response ?? pbErr?.data ?? pbErr, null, 2))
        throw pbErr
      }
    } else {
      // ── Scenario B: user has NO password (usePassword === false) ──
      // pb is already admin-authenticated, set the password directly
      const updatePayload: Record<string, unknown> = {
        password: newPassword,
        passwordConfirm: newPasswordConfirm,
        usePassword: true,
        emailVisibility: true,
      }

      // Clear plainPassword since the real password is now hashed in PB
      if (typeof userRecord.plainPassword !== "undefined") {
        updatePayload.plainPassword = ""
      }

      try {
        await pb.collection("users").update(userId, updatePayload)
      } catch (pbErr: any) {
        console.error("PB update error details:", JSON.stringify(pbErr?.response ?? pbErr?.data ?? pbErr, null, 2))
        throw pbErr
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("POST /api/student/change-password error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur." },
      { status: err?.status ?? 500 }
    )
  }
}
