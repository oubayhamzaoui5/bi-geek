"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// type: "page" = go to another page
// type: "home-section" = anchor on "/"
const navLinks = [
  { href: "/#about", label: "À propos", type: "home-section" },
  { href: "/courses", label: "Formations", type: "page" },
  { href: "/bootcamps", label: "Bootcamps", type: "page" },
  { href: "/#contact", label: "Contact", type: "home-section" },
  { href: "/#faq", label: "FAQ", type: "home-section" },
]

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  )
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<{ username: string; role: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const pathname = usePathname()
  const router = useRouter()

  // Check for logged-in user
  useEffect(() => {
    const userString = localStorage.getItem("user")
    if (userString) {
      setUser(JSON.parse(userString))
    }
    setAuthLoading(false)
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  function smoothScrollTo(targetId: string, offset = 60) {
    const el = document.querySelector(targetId)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.pageYOffset - offset
    window.scrollTo({ top: y, behavior: "smooth" })
  }

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        isScrolled ? "bg-background/95 backdrop-blur-md shadow-md" : "bg-background"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="relative flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              <span className="text-accent">BI</span>
              <span className="text-foreground"> GEEK</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div
            className={cn(
              "hidden lg:flex items-center gap-6",
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            )}
          >
            {navLinks.map((link) => {
              if (link.type === "page") {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              }

              const [, hash] = link.href.split("#")
              const targetId = `#${hash}`

              if (pathname === "/") {
                return (
                  <button
                    key={link.href}
                    onClick={() => smoothScrollTo(targetId, 60)}
                    className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                )
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* AUTH BUTTON */}
            <Button
              size="sm"
              className={cn(
                "min-w-[100px] flex items-center justify-center gap-2 cursor-pointer",
                "bg-accent hover:bg-[#7d3d9f] text-white"
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
                  <UserIcon size={16} />
                  {user.username}
                </>
              ) : (
                <Link href="/login" className="w-full text-center">
                  Se connecter
                </Link>
              )}
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t py-4">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => {
                if (link.type === "page") {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                }

                const [, hash] = link.href.split("#")
                const targetId = `#${hash}`

                if (pathname === "/") {
                  return (
                    <button
                      key={link.href}
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        requestAnimationFrame(() => smoothScrollTo(targetId, 60))
                      }}
                      className="text-sm text-left font-medium text-muted-foreground hover:text-accent transition-colors py-2 cursor-pointer"
                    >
                      {link.label}
                    </button>
                  )
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
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
