"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/#about",   label: "À propos",   type: "home-section" },
  { href: "/courses",  label: "Formations", type: "page" },
  { href: "/bootcamps",label: "Bootcamps",  type: "page" },
  { href: "/#contact", label: "Contact",    type: "home-section" },
  { href: "/#faq",     label: "FAQ",        type: "home-section" },
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
    if (str) setUser(JSON.parse(str))
    setAuthLoading(false)
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
              if (link.type === "page") {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm"
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
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-sm"
                  >
                    {link.label}
                  </button>
                )
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm"
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className={cn(
                "min-w-[104px] flex items-center justify-center gap-2 cursor-pointer rounded-none text-sm font-semibold",
                "bg-accent hover:bg-accent/90 text-white"
              )}
              disabled={authLoading}
              onClick={() => {
                if (!user) return
                if (user.role === "admin") router.push("/admin-dashboard")
                else if (user.role === "instructor") router.push("/instructor-dashboard")
                else router.push("/student-dashboard")
              }}
            >
              {authLoading ? (
                <Spinner />
              ) : user ? (
                <>
                  <UserIcon size={15} />
                  {user.username}
                </>
              ) : (
                <Link href="/login" className="w-full text-center">Se connecter</Link>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border py-4 bg-background">
            <div className="flex flex-col">
              {navLinks.map((link) => {
                if (link.type === "page") {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border-b border-border/50 last:border-0"
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
                      className="px-2 py-3 text-sm text-left font-medium text-muted-foreground hover:text-foreground border-b border-border/50 last:border-0 cursor-pointer"
                    >
                      {link.label}
                    </button>
                  )
                }
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border-b border-border/50 last:border-0"
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
