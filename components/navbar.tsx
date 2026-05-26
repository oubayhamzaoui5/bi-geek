"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/",            label: "Accueil",            type: "page",         accent: false },
  { href: "/a-propos",    label: "À propos",          type: "page",         accent: false },
  { href: "/formations",   label: "Formations",         type: "page",         accent: false },
  { href: "/#contact",    label: "Contact",            type: "home-section", accent: false },
  { href: "/entreprises", label: "Offres entreprise",  type: "page",         accent: true  },
]

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  )
}

export function Navbar() {
  const [isScrolled, setIsScrolled]         = useState(false)
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser]                     = useState<{ username: string; role: string } | null>(null)
  const [authLoading, setAuthLoading]       = useState(true)
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    const str = localStorage.getItem("user")
    if (str) {
      try { setUser(JSON.parse(str)) } catch {}
    }

    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.id) {
          localStorage.setItem("user", JSON.stringify(data.user))
          setUser(data.user)
        } else {
          localStorage.removeItem("user")
          setUser(null)
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  function smoothScrollTo(id: string, offset = 64) {
    const el = document.querySelector(id)
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - offset, behavior: "smooth" })
  }

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-background border-b border-transparent"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="font-display text-2xl font-bold text-accent tracking-tight">BI</span>
            <span className="font-display text-2xl font-bold text-foreground tracking-tight"> GEEK</span>
          </Link>

          {/* Desktop nav — centred */}
          <div className="hidden lg:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {navLinks.map((link) => {
              const accentCls = link.accent
                ? "text-[#8b0f82] font-semibold hover:text-[#710c6a]"
                : "text-muted-foreground hover:text-foreground"
              if (link.type === "page") {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 text-sm font-medium transition-colors rounded-sm ${accentCls}`}
                  >
                    {link.label}
                  </Link>
                )
              }
              const [, hash] = link.href.split("#")
              if (pathname === "/") {
                return (
                  <button
                    key={link.href}
                    onClick={() => smoothScrollTo(`#${hash}`, 64)}
                    className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer rounded-sm ${accentCls}`}
                  >
                    {link.label}
                  </button>
                )
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 text-sm font-medium transition-colors rounded-sm ${accentCls}`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {authLoading ? (
              <div className="min-w-[104px] flex items-center justify-center gap-2 h-8 px-3 rounded-none text-sm font-semibold bg-accent text-white opacity-50">
                <Spinner />
              </div>
            ) : user ? (
              <button
                type="button"
                className="min-w-[104px] flex items-center justify-center gap-2 h-8 px-3 rounded-none text-sm font-semibold bg-accent hover:bg-accent/90 text-white transition-colors cursor-pointer"
                onClick={() => {
                  if (user.role === "admin" || user.role === "admin_agent") router.push("/admin-dashboard")
                  else if (user.role === "instructor") router.push("/instructor-dashboard")
                  else router.push("/student-dashboard")
                }}
              >
                <UserIcon size={15} />
                {user.username}
              </button>
            ) : (
              <Link
                href="/login"
                className="min-w-[104px] flex items-center justify-center gap-2 h-8 px-3 rounded-none text-sm font-semibold bg-accent hover:bg-accent/90 text-white transition-colors"
              >
                Se connecter
              </Link>
            )}

            <button
              type="button"
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent/10 transition-colors"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border py-4 bg-background">
            <div className="flex flex-col">
              {navLinks.map((link) => {
                const accentCls = link.accent
                  ? "text-[#8b0f82] font-semibold"
                  : "text-muted-foreground"
                if (link.type === "page") {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-2 py-3 text-sm font-medium border-b border-border/50 last:border-0 ${accentCls}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                }
                const [, hash] = link.href.split("#")
                if (pathname === "/") {
                  return (
                    <button
                      key={link.href}
                      onClick={() => {
                        setMobileMenuOpen(false)
                        requestAnimationFrame(() => smoothScrollTo(`#${hash}`, 64))
                      }}
                      className={`px-2 py-3 text-sm text-left font-medium border-b border-border/50 last:border-0 cursor-pointer ${accentCls}`}
                    >
                      {link.label}
                    </button>
                  )
                }
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-2 py-3 text-sm font-medium border-b border-border/50 last:border-0 ${accentCls}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
