"use client"

import { useEffect, useState } from "react"
import { Bell, Search, ChevronDown, LogOut, User, Settings } from "lucide-react"

interface HeaderProps {
  variant?: "student" | "admin"
  announcementCount?: number
}

export function Header({ variant = "student", announcementCount = 0 }: HeaderProps) {
  const [userName, setUserName] = useState("")
  const [userInitials, setUserInitials] = useState("U")
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      const user = raw ? JSON.parse(raw) : null
      const name =
        user?.username?.trim() ||
        user?.email?.split("@")?.[0]?.trim() ||
        (variant === "admin" ? "Admin" : "Étudiant")
      setUserName(name)
      setUserInitials(
        name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      )
    } catch {
      setUserName(variant === "admin" ? "Admin" : "Étudiant")
      setUserInitials("U")
    }
  }, [variant])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-user-menu]")) setDropdownOpen(false)
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [dropdownOpen])

  const handleLogout = async () => {
    localStorage.removeItem("user")
    await fetch("/api/logout", { method: "POST" }).catch(() => {})
    window.location.href = "/"
  }

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 md:px-8 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title */}
        <div className="hidden md:block shrink-0">
          <h2 className="text-sm font-medium text-muted-foreground">
            {variant === "admin" ? "Administration" : "Tableau de Bord"}
          </h2>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border/60 rounded-lg
                         placeholder:text-muted-foreground/60
                         focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50
                         transition-all"
            />
            <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2
                            px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60
                            bg-background border border-border rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Bell */}
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" title="Notifications">
            <Bell size={20} className="text-foreground" />
            {announcementCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                               flex items-center justify-center
                               text-[10px] font-bold text-white bg-red-500 rounded-full
                               shadow-sm shadow-red-500/30">
                {announcementCount > 9 ? "9+" : announcementCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="relative" data-user-menu>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/60
                              flex items-center justify-center text-[11px] font-bold text-white
                              ring-2 ring-background shadow-sm">
                {userInitials}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                {userName}
              </span>
              <ChevronDown size={14} className={`hidden sm:block text-muted-foreground transition-transform
                ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 py-1.5
                              bg-card border border-border rounded-xl shadow-xl
                              animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{variant}</p>
                </div>

                <a
                  href={variant === "admin" ? "/admin-dashboard" : "/student-dashboard/settings"}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Settings size={14} />
                  Paramètres
                </a>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                >
                  <LogOut size={14} />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
