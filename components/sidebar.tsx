"use client"

import { useState } from "react"
import {
  Menu, X, Home, BookOpen, Award, Settings, LogOut, ChevronLeft,
  Calendar, MessageSquare, Megaphone
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar-context"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true) // mobile slide-in
  const { isCollapsed, setIsCollapsed } = useSidebar() // from context
  const pathname = usePathname()

  const primaryLinks = [
    { icon: Home,          label: "Accueil",      href: "/student-dashboard" },
    { icon: BookOpen,      label: "Formations",   href: "/student-dashboard/courses" },
    { icon: Calendar,      label: "Calendrier",   href: "/student-dashboard/calendar" },
    { icon: MessageSquare, label: "Messages",     href: "/student-dashboard/messages" },
    { icon: Megaphone,     label: "Annonces",     href: "/student-dashboard/announcements" },
    { icon: Award,         label: "Certificats",  href: "/student-dashboard/certificates" },
    { icon: Settings,      label: "Paramètres",   href: "/student-dashboard/settings" },
  ]

  const isActivePath = (href: string) => {
    if (href === "/student-dashboard/courses") {
      return pathname.startsWith("/student-dashboard/course") ||
             pathname.startsWith("/student-dashboard/courses")
    }
    return pathname === href
  }

  return (
    <>
      {/* Mobile burger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-primary text-primary-foreground"
        aria-label="Ouvrir/fermer le menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`group fixed md:relative h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "w-16 md:w-16" : "w-64 md:w-64"}
        `}
        style={{ overflow: "visible" }}
      >
        {/* Collapse pill */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2
                     w-9 h-9 rounded-full items-center justify-center
                     bg-sidebar text-sidebar-foreground/80 border border-sidebar-border shadow
                     hover:text-sidebar-foreground z-50 cursor-pointer"
          aria-label={isCollapsed ? "Étendre la barre latérale" : "Réduire la barre latérale"}
          title={isCollapsed ? "Étendre" : "Réduire"}
        >
          <ChevronLeft size={18} className={`${isCollapsed ? "rotate-180" : ""} transition-transform`} />
        </button>

        {/* CONTENT */}
        <div className="flex h-full flex-col">
          {/* === LOGO (replaced) === */}
          {isCollapsed ? (
            <Link href="/" className="flex items-center justify-center mt-3" aria-label="BI GEEK - Accueil">
              <div className="text-xl font-extrabold leading-none select-none">
                <span className="text-accent">BI</span>
              </div>
            </Link>
          ) : (
            <Link href="/" className="flex items-center w-full px-3 mt-3 gap-2" aria-label="BI GEEK - Accueil">
              <div className="text-2xl font-bold">
                <span className="text-accent">BI</span>
                <span className="text-white"> GEEK</span>
              </div>
            </Link>
          )}
          {/* === /LOGO === */}

          {/* Nav */}
          <div className="flex-1 overflow-y-auto px-2">
            <div className="flex flex-col items-stretch w-full mt-3 border-t border-sidebar-border/50">
              {primaryLinks.map((item, i) => {
                const active = isActivePath(item.href)
                return (
                  <Link
                    key={i}
                    href={item.href}
                    scroll
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center w-full rounded
                      ${isCollapsed ? "justify-center h-12 mt-2" : "h-12 px-3 mt-2"}
                      ${active ? "bg-sidebar-accent/20 text-accent" : "text-sidebar-foreground hover:bg-sidebar-accent/10"}
                      transition-colors`}
                  >
                    <item.icon className="shrink-0" size={24} />
                    {!isCollapsed && <span className="ml-2 text-sm font-medium">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
            <div className="flex flex-col items-stretch w-full mt-2 border-t border-sidebar-border/50" />
          </div>

          {/* Bottom */}
          <button
            title={isCollapsed ? "Déconnexion" : undefined}
            className={`w-full flex items-center
              ${isCollapsed ? "justify-center h-16" : "h-16 px-3"}
              bg-sidebar/60 hover:bg-sidebar-accent/10 text-sidebar-foreground transition-colors`}
          >
            <LogOut size={22} className="shrink-0" />
            {!isCollapsed && <span className="ml-2 text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 md:hidden z-30" onClick={() => setIsOpen(false)} />}
    </>
  )
}
