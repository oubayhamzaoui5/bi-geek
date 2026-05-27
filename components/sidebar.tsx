"use client"

import { useState, useEffect } from "react"
import {
  Menu, X, Home, BookOpen, Settings, LogOut,
  Layers, Users, ClipboardList, Star, CalendarDays,
  GraduationCap,
} from "lucide-react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar-context"
import { unregisterDashboardPushNotifications } from "@/components/PushNotificationPrompt"

export function Sidebar({ variant = "student", compact = false }: { variant?: "student" | "admin" | "instructor"; compact?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const pathname = usePathname()
  const isAdmin = variant === "admin"
  const isInstructor = variant === "instructor"

  const [userName, setUserName] = useState("")
  const [userInitials, setUserInitials] = useState("U")
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null")
      return user?.role ?? ""
    } catch {
      return ""
    }
  })
  const railAvatarStyle = {
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    aspectRatio: "1 / 1",
    borderRadius: "9999px",
    flexShrink: 0,
  } as const
  const studentAvatarStyle = {
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    aspectRatio: "1 / 1",
    borderRadius: "9999px",
    flexShrink: 0,
  } as const

  const logout = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null")
      if (user?.id) await unregisterDashboardPushNotifications(user.id)
    } catch {}
    localStorage.removeItem("user")
    await fetch("/api/logout", { method: "POST" }).catch(() => {})
    window.location.assign("/")
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      const user = raw ? JSON.parse(raw) : null
      const fallback = variant === "admin" ? "Admin" : variant === "instructor" ? "Formateur" : "Apprenant"
      const name =
        user?.username?.trim() ||
        user?.email?.split("@")?.[0]?.trim() ||
        fallback
      const avatar = typeof user?.avatar === "string" && user.avatar.trim() ? user.avatar.trim() : null
      setUserName(name)
      setUserInitials(
        name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
      )
      setUserAvatar(avatar)
      setCurrentUserRole(user?.role ?? "")
      if (user?.id && user?.role) {
        const profileRole = user.role === "admin" || user.role === "admin_agent" ? "admin" : user.role
        fetch(`/api/${profileRole}/profile?userId=${encodeURIComponent(user.id)}`)
          .then(res => res.ok ? res.json() : null)
          .then(profile => {
            if (!profile) return
            const refreshedName =
              profile.username?.trim() ||
              profile.email?.split("@")?.[0]?.trim() ||
              name
            const refreshedAvatar = typeof profile.avatar === "string" && profile.avatar.trim() ? profile.avatar.trim() : null
            setUserName(refreshedName)
            setUserInitials(refreshedName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2))
            setUserAvatar(refreshedAvatar)
            localStorage.setItem("user", JSON.stringify({ ...user, email: profile.email ?? user.email, avatar: refreshedAvatar }))
          })
          .catch(() => {})
      }
    } catch {
      setUserName(variant === "admin" ? "Admin" : variant === "instructor" ? "Formateur" : "Apprenant")
      setUserInitials("U")
      setUserAvatar(null)
    }
  }, [variant])

  const adminAgentLinks = [
    { icon: Home, label: "Accueil", href: "/admin-dashboard/overview" },
    { icon: BookOpen, label: "Formations", href: "/admin-dashboard/courses" },
    { icon: Layers, label: "Bootcamps", href: "/admin-dashboard/bootcamps" },
    { icon: Users, label: "Groupes", href: "/admin-dashboard/groups" },
    { icon: CalendarDays, label: "Agenda", href: "/admin-dashboard/agenda" },
    { icon: Users, label: "Utilisateurs", href: "/admin-dashboard/users" },
    { icon: ClipboardList, label: "Inscriptions", href: "/admin-dashboard/enrollments" },
    { icon: Star, label: "Vedettes", href: "/admin-dashboard/featured" },
    { icon: Settings, label: "Paramètres", href: "/admin-dashboard/settings" },
  ]

  const adminLinks = [
    { icon: Users, label: "Utilisateurs", href: "/admin-dashboard/users" },
  ]

  const instructorLinks = [
    { icon: Home, label: "Accueil", href: "/instructor-dashboard/overview" },
    { icon: Users, label: "Mes formations", href: "/instructor-dashboard/groups" },
    { icon: CalendarDays, label: "Agenda", href: "/instructor-dashboard/agenda" },
    { icon: Settings, label: "Paramètres", href: "/instructor-dashboard/settings" },
  ]

  const studentLinks = [
    { icon: Home, label: "Accueil", href: "/student-dashboard/overview" },
    { icon: Users, label: "Mes formations", href: "/student-dashboard/groups" },
    { icon: CalendarDays, label: "Agenda", href: "/student-dashboard/agenda" },
    { icon: Settings, label: "Paramètres", href: "/student-dashboard/settings" },
  ]

  const primaryLinks = variant === "admin" ? (currentUserRole === "admin" ? adminLinks : adminAgentLinks) : variant === "instructor" ? instructorLinks : studentLinks

  const isActivePath = (href: string) => {
    if (href === "/student-dashboard/overview") {
      return pathname === "/student-dashboard/overview" || pathname === "/student-dashboard" || pathname === "/student-dashboard/"
    }
    if (href === "/student-dashboard") {
      return pathname === "/student-dashboard" || pathname === "/student-dashboard/"
    }
    if (href === "/student-dashboard/courses") {
      return pathname.startsWith("/student-dashboard/course") ||
             pathname.startsWith("/student-dashboard/courses")
    }
    if (href === "/admin-dashboard/overview") {
      return pathname === "/admin-dashboard/overview" || pathname === "/admin-dashboard"
    }
    if (href === "/instructor-dashboard/overview") {
      return pathname === "/instructor-dashboard/overview" || pathname === "/instructor-dashboard"
    }
    return pathname === href || pathname.startsWith(href + "/")
  }

  // ── ADMIN / INSTRUCTOR SIDEBAR: icon-only, hover-expand ────────────────────
  if (compact || isAdmin || isInstructor) {
    return (
      <>
        {/* Mobile burger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white border border-gray-200 text-gray-700 shadow-sm"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Sidebar — narrow, expands on hover */}
        <aside
          className="group fixed left-0 top-0 h-screen bg-white border-r border-gray-100 z-40
            w-[60px] hover:w-[220px] transition-[width] duration-200 ease-in-out overflow-hidden
            hidden md:flex flex-col"
          style={{ willChange: "width" }}
        >
          {/* Logo */}
          <Link
            href="/"
            aria-label="BI GEEK"
            className="flex items-center h-[60px] px-[18px] border-b border-gray-100 flex-shrink-0 overflow-visible"
          >
            <div className="flex items-center justify-center flex-shrink-0">
              <span className="font-display text-2xl font-bold text-accent tracking-tight leading-none">BI</span>
            </div>
            <span
              className="ml-1 inline-flex overflow-visible
                max-w-0 group-hover:max-w-[160px] opacity-0 group-hover:opacity-100
                transition-all duration-200"
            >
              <span className="font-display text-2xl font-bold text-gray-900 tracking-tight leading-none whitespace-nowrap overflow-visible">
                GEEK
              </span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-2">
            {primaryLinks.map((item, i) => {
              const active = isActivePath(item.href)
              return (
                <Link
                  key={i}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center h-[42px] px-[12px] rounded-lg mb-0.5 whitespace-nowrap
                    transition-colors duration-150
                    ${active
                      ? "bg-accent/80 text-white"
                      : "text-black hover:bg-accent/10 hover:text-black"
                    }`}
                >
                  <item.icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    className="flex-shrink-0"
                  />
                  <span
                    className={`ml-3 text-[13px] whitespace-nowrap overflow-hidden
                      max-w-0 group-hover:max-w-[160px] opacity-0 group-hover:opacity-100
                      transition-all duration-200
                      ${active ? "font-semibold text-white" : "font-medium text-black"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom: avatar + logout */}
          <div className="border-t border-gray-100 py-3 px-2 flex-shrink-0">
            {/* User */}
            <Link
              href={`/${variant === "admin" ? "admin" : variant === "instructor" ? "instructor" : "student"}-dashboard/settings`}
              className="flex items-center h-[42px] px-[14px] rounded-lg whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors duration-150"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="object-cover"
                  style={{ ...railAvatarStyle, display: "block" }}
                  onError={() => setUserAvatar(null)}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent/60
                                flex items-center justify-center text-[10px] font-bold text-white"
                  style={railAvatarStyle}
                >
                  {userInitials}
                </div>
              )}
              <div
                className="ml-3 overflow-hidden max-w-0 group-hover:max-w-[160px]
                  opacity-0 group-hover:opacity-100 transition-all duration-200 min-w-0"
              >
                <p className="text-[12px] font-semibold text-gray-800 truncate leading-tight">{userName}</p>
                <p className="text-[10px] text-gray-400 capitalize leading-tight">{isInstructor ? "formateur" : isAdmin ? (currentUserRole === "admin_agent" ? "agent administratif" : "admin") : "apprenant"}</p>
              </div>
            </Link>
            {/* Logout */}
            <button
              onClick={logout}
              title="Déconnexion"
              className="flex items-center w-full h-[42px] px-[14px] rounded-lg whitespace-nowrap
                text-red-500 hover:bg-transparent hover:text-red-500 transition-colors duration-150 cursor-pointer"
            >
              <LogOut size={18} strokeWidth={1.8} className="flex-shrink-0" />
              <span
                className="ml-3 text-[13px] font-medium overflow-hidden
                  max-w-0 group-hover:max-w-[160px] opacity-0 group-hover:opacity-100
                  transition-all duration-200"
              >
                Déconnexion
              </span>
            </button>
          </div>
        </aside>

        {/* Mobile sidebar (full labels, slide in) */}
        {mobileOpen && (
          <>
            <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-gray-100 z-40 md:hidden flex flex-col">
              <div className="flex items-center justify-between h-[60px] px-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-2xl font-bold text-accent tracking-tight leading-none">BI</span>
                  </div>
                  <span className="ml-1 font-display text-2xl font-bold text-gray-900 tracking-tight leading-none">
                    GEEK
                  </span>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-2">
                {primaryLinks.map((item, i) => {
                  const active = isActivePath(item.href)
                  return (
                    <Link key={i} href={item.href} onClick={() => setMobileOpen(false)}
                      className={`flex items-center h-[42px] px-3 rounded-lg mb-0.5 gap-3
                        ${active ? "bg-accent/80 text-white font-semibold" : "text-black hover:bg-accent/10 hover:text-black"}
                        transition-colors`}>
                      <item.icon size={18} strokeWidth={active ? 2.5 : 1.8} className="flex-shrink-0" />
                      <span className="text-[13px]">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
              <div className="border-t border-gray-100 py-3 px-2">
                <button onClick={logout}
                  className="flex items-center w-full h-[42px] px-3 rounded-lg gap-3 text-red-500 hover:bg-transparent hover:text-red-500 transition-colors cursor-pointer">
                  <LogOut size={18} strokeWidth={1.8} />
                  <span className="text-[13px] font-medium">Déconnexion</span>
                </button>
              </div>
            </aside>
            <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
          </>
        )}
      </>
    )
  }

  // ── STUDENT SIDEBAR: original collapsible design ────────────────────────────
  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-primary text-primary-foreground"
        aria-label="Ouvrir/fermer le menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`group fixed md:relative h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 z-40
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "w-16 md:w-16" : "w-64 md:w-64"}
        `}
        style={{ overflow: "visible" }}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2
                     w-6 h-6 rounded-full items-center justify-center
                     bg-sidebar text-sidebar-foreground/80 border border-sidebar-border shadow
                     hover:text-sidebar-foreground z-50 cursor-pointer"
        >
          <span className={`text-xs ${isCollapsed ? "rotate-180" : ""} transition-transform inline-block`}>‹</span>
        </button>

        <div className="flex h-full flex-col">
          {isCollapsed ? (
            <Link href="/" className="flex items-center justify-center mt-3" aria-label="BI GEEK">
              <div className="text-2xl font-extrabold"><span className="text-accent">B</span></div>
            </Link>
          ) : (
            <Link href="/" className="flex items-center w-full justify-center px-3 mt-3 gap-2" aria-label="BI GEEK">
              <div className="text-2xl font-bold whitespace-nowrap">
                <span className="text-accent">BI</span>
                <span className="text-white"> GEEK</span>
              </div>
            </Link>
          )}

          <Link
            href="/student-dashboard/settings"
            className={`mx-2 mt-3 mb-1 rounded-lg bg-sidebar-accent/15 border border-sidebar-border/30 cursor-pointer hover:bg-sidebar-accent/25 transition-colors
              ${isCollapsed ? "flex items-center justify-center p-2" : "p-3"}`}
          >
            <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="object-cover"
                  style={{ ...studentAvatarStyle, display: "block" }}
                  onError={() => setUserAvatar(null)}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/60
                                flex items-center justify-center text-[11px] font-bold text-white"
                  style={studentAvatarStyle}
                >
                  {userInitials}
                </div>
              )}
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">{userName}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 capitalize">{variant}</p>
                </div>
              )}
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="flex flex-col items-stretch w-full mt-2 border-t border-sidebar-border/50">
              {primaryLinks.map((item, i) => {
                const active = isActivePath(item.href)
                return (
                  <Link key={i} href={item.href} scroll title={isCollapsed ? item.label : undefined}
                    className={`flex items-center w-full rounded
                      ${isCollapsed ? "justify-center h-11 mt-1.5" : "h-11 px-3 mt-1.5"}
                      ${active ? "bg-sidebar-accent/20 text-accent" : "text-sidebar-foreground hover:bg-sidebar-accent/10"}
                      transition-colors`}>
                    <item.icon className="shrink-0" size={20} />
                    {!isCollapsed && <span className="ml-2 text-sm font-medium">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>

          <button
            onClick={logout}
            className={`w-full flex items-center cursor-pointer
              ${isCollapsed ? "justify-center h-14" : "h-14 px-3"}
              bg-transparent hover:bg-transparent text-red-500 hover:text-red-500 transition-colors`}
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span className="ml-2 text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 md:hidden z-30" onClick={() => setMobileOpen(false)} />}
    </>
  )
}
