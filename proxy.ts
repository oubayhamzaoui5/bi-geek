import { NextResponse, type NextRequest } from "next/server"

const AUTH_COOKIE = "bi_geek_auth"
const PB_URL = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090"

const ROLE_RULES = [
  { prefix: "/api/admin", roles: ["admin", "admin_agent"] },
  { prefix: "/api/dashboard", roles: ["admin", "admin_agent", "instructor", "student"] },
  { prefix: "/api/instructor", roles: ["instructor", "admin", "admin_agent"] },
  { prefix: "/api/student", roles: ["student", "admin", "admin_agent"] },
]

const NOINDEX_PREFIXES = [
  "/admin-dashboard",
  "/student-dashboard",
  "/instructor-dashboard",
  "/studet-dashboard",
  "/login",
  "/forgot-password",
  "/forgot-username",
  "/force-change-password",
  "/pdf-viewer",
  "/video-viewer",
  "/meet",
]

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const rule = ROLE_RULES.find((item) => pathname.startsWith(item.prefix))
  if (!rule) {
    const res = NextResponse.next()
    if (NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow")
    }
    return res
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 })
  }

  try {
    const refresh = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: "POST",
      headers: { Authorization: token },
      cache: "no-store",
    })

    if (!refresh.ok) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 })
    }

    const data = await refresh.json()
    const role = data?.record?.role ?? "student"
    if (!rule.roles.includes(role)) {
      return NextResponse.json({ error: "Permission refusee." }, { status: 403 })
    }

    const res = NextResponse.next()
    res.headers.set("x-bi-geek-user-id", data?.record?.id ?? "")
    res.headers.set("x-bi-geek-user-role", role)
    return res
  } catch {
    return NextResponse.json({ error: "Verification de session impossible." }, { status: 401 })
  }
}

export const config = {
  matcher: [
    "/api/admin/:path*",
    "/api/dashboard/:path*",
    "/api/instructor/:path*",
    "/api/student/:path*",
    "/admin-dashboard/:path*",
    "/student-dashboard/:path*",
    "/instructor-dashboard/:path*",
    "/studet-dashboard/:path*",
    "/login",
    "/forgot-password",
    "/forgot-username",
    "/force-change-password",
    "/pdf-viewer/:path*",
    "/video-viewer",
    "/meet",
  ],
}
