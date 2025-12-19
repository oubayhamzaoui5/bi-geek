"use client"

import { Bell, Calendar } from "lucide-react"

type Announcement = {
  id: number
  title: string
  date: string // ISO string like "2025-11-03"
  course?: string
  author?: string
  href?: string
}

const announcements: Announcement[] = [
  {
    id: 1,
    title: "MAJ du projet: dépôt Git obligatoire avant vendredi",
    date: "2025-11-03",
    course: "Power BI — Fondamentaux",
    author: "Equipe Pédagogique",
    href: "#",
  },
  {
    id: 2,
    title: "Nouveau quiz disponible (Chapitre 3 : DAX Basics)",
    date: "2025-11-02",
    course: "Power BI — Fondamentaux",
    author: "Alexandre Dupont",
  },
  {
    id: 3,
    title: "Report du live Q&A à demain 18:00",
    date: "2025-11-01",
    course: "Visualisation Avancée",
    author: "Marie Leclerc",
  },
    {
    id: 4,
    title: "Report du live Q&A à demain 18:00",
    date: "2025-11-01",
    course: "Visualisation Avancée",
    author: "Marie Leclerc",
  },
]

export function RecentAnnouncements() {
  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-4 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          Annonces récentes
        </h3>

        {/* Optional: "Voir tout" action */}
        <a
          href="#"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Voir tout
        </a>
      </div>

        <div
        className="space-y-3 overflow-y-auto pr-1 -mr-1 max-h-[18rem]"
        style={{ scrollbarGutter: "stable" }}
      >
        {announcements.map((a) => (
          <a
            key={a.id}
            href={a.href ?? "#"}
            className="block p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">
              {a.title}
            </h4>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar size={12} className="shrink-0" />
                <span>
                  {new Date(a.date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {a.course && (
                  <span className="whitespace-nowrap">
                    Cours : <span className="text-foreground">{a.course}</span>
                  </span>
                )}
                {a.author && (
                  <span className="whitespace-nowrap">
                    Auteur : <span className="text-foreground">{a.author}</span>
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
