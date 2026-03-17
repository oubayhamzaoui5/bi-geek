"use client"

import { Bell, Calendar } from "lucide-react"

export type Announcement = {
  id: string
  title: string
  date: string
  course?: string
  author?: string
  href?: string
}

export function RecentAnnouncements({ announcements = [] }: { announcements?: Announcement[] }) {
  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-4 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          Annonces rÃ©centes
        </h3>

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
        {announcements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Aucune annonce pour le moment.
          </div>
        ) : (
          announcements.map((a) => (
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
          ))
        )}
      </div>
    </div>
  )
}
