"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border" style={{ backgroundColor: "oklch(0.965 0.004 80)" }}>
      <div className="container mx-auto px-4 md:px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Brand */}
          <div className="space-y-2">
            <div className="font-display text-2xl font-bold tracking-tight">
              <span className="text-accent">BI</span>
              <span className="text-foreground"> GEEK</span>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
              Apprendre · Innover · Devenir
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {[
              { label: "Formations", href: "/courses" },
              { label: "Bootcamps", href: "/bootcamps" },
              { label: "À propos", href: "/#about" },
              { label: "Contact", href: "/#contact" },
              { label: "FAQ", href: "/#faq" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Aide</a>
            <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
            <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">© 2025 BI Geek. Tous droits réservés.</p>
          <p className="text-xs text-muted-foreground">Tunis, Tunisie</p>
        </div>
      </div>
    </footer>
  )
}
