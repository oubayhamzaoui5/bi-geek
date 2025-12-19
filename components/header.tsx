"use client"

import { Bell, User } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 md:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h2 className="text-sm text-muted-foreground">Tableau de Bord</h2>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {/* Notification Bell */}
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell size={20} className="text-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full glow-accent" />
          </button>

          {/* User Avatar */}
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
              <User size={16} className="text-accent-foreground" />
            </div>
            <span className="hidden sm:inline text-sm font-medium">Jean Dupont</span>
          </button>
        </div>
      </div>
    </header>
  )
}
