"use client"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm px-6 md:px-8 py-6 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© 2025 BI Geek. Tous droits réservés.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground transition-colors">
            Aide
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Conditions
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Confidentialité
          </a>
        </div>
        <p className="italic text-xs">Apprendre. Innover. Devenir un Geek.</p>
      </div>
    </footer>
  )
}
