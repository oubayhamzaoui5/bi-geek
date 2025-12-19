"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "./language-switcher"
import { cn } from "@/lib/utils"

// type: "page" = go to another page
// type: "home-section" = anchor on "/"
const navLinks = [
  { href: "/about", label: "À propos", type: "page" },
  { href: "/formations", label: "Formations", type: "page" },
  { href: "/bootcamps", label: "Bootcamps", type: "page" },

  // anchored sections on "/"
  { href: "/#formateurs", label: "Formateurs", type: "home-section" },
  { href: "/#contact", label: "Contact", type: "home-section" },
  { href: "/#faq", label: "FAQ", type: "home-section" },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  function smoothScrollTo(href: string) {
    if (!href.startsWith("#")) return
    const el = document.querySelector(href)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
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
              "absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2"
            )}
          >
            {navLinks.map((link) => {
              // PAGE LINKS: never smooth-scroll
              if (link.type === "page") {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              }

              // HOME SECTIONS (/#programmes, /#contact, ...)
              const [, hash] = link.href.split("#") // "/#programmes" -> [" /", "programmes"]
              const targetId = `#${hash}`

              // If we're already on "/", use smooth scroll
              if (pathname === "/") {
                return (
                  <button
                    key={link.href}
                    onClick={() => smoothScrollTo(targetId)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                )
              }

              // From other pages → classic navigation to "/#section"
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <Button asChild size="sm" className="bg-accent hover:bg-[#7d3d9f] text-white">
              <Link href="/login">Se connecter</Link>
            </Button>

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
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                }

                const [, hash] = link.href.split("#")
                const targetId = `#${hash}`

                // On "/", smooth scroll
                if (pathname === "/") {
                  return (
                    <button
                      key={link.href}
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        requestAnimationFrame(() => smoothScrollTo(targetId))
                      }}
                      className="text-sm text-left font-medium text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer"
                    >
                      {link.label}
                    </button>
                  )
                }

                // On other pages, navigate to "/#section"
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              })}

              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Se connecter
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
