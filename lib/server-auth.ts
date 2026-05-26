import PocketBase from "pocketbase"

export const AUTH_COOKIE = "bi_geek_auth"

export type AuthUser = {
  id: string
  role: string
  username: string
  email: string
  usePassword: boolean
}

export class AuthError extends Error {
  status: number

  constructor(message = "Non autorise.", status = 401) {
    super(message)
    this.status = status
  }
}

export function getServerPb() {
  return new PocketBase(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090")
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  }
}

export async function getAdminPb() {
  const pb = getServerPb()
  const email = process.env.POCKETBASE_ADMIN_EMAIL!
  const password = process.env.POCKETBASE_ADMIN_PASSWORD!
  try {
    await pb.collection("_superusers").authWithPassword(email, password)
  } catch {
    // PocketBase < v0.23 fallback
    await (pb as any).admins.authWithPassword(email, password)
  }
  return pb
}

export async function getRequestUser(req: Request): Promise<AuthUser> {
  const token = getCookie(req, AUTH_COOKIE)
  if (!token) throw new AuthError()

  const pb = getServerPb()
  pb.authStore.save(token, null)

  try {
    const auth = await pb.collection("users").authRefresh()
    const user = auth.record
    return {
      id: user.id,
      role: user.role ?? "student",
      username: user.username ?? "",
      email: user.email ?? "",
      usePassword: user.usePassword ?? false,
    }
  } catch {
    throw new AuthError()
  }
}

export async function requireUser(req: Request, allowedRoles?: string[]) {
  const user = await getRequestUser(req)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AuthError("Permission refusee.", 403)
  }
  return user
}

export function assertSelfOrRole(user: AuthUser, targetId: string | null | undefined, allowedRoles: string[] = ["admin", "admin_agent"]) {
  if (!targetId || (user.id !== targetId && !allowedRoles.includes(user.role))) {
    throw new AuthError("Permission refusee.", 403)
  }
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  return null
}

function getCookie(req: Request, name: string) {
  const header = req.headers.get("cookie")
  if (!header) return null
  const cookie = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null
}
