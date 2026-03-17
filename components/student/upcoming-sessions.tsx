"use client"

import { Calendar, Radio } from "lucide-react"

export type Session = {
  id: string
  title: string
  date: string
  time: string
  durationMin?: number
  instructor: string
  joinUrl?: string
  isLive?: boolean
}

function parseDateTimeISO(dateStr: string, timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number)
  const d = new Date(dateStr)
  d.setHours(h, m ?? 0, 0, 0)
  return d
}

function isLiveNow(s: Session, now = new Date()): boolean {
  if (s.isLive) return true
  const start = parseDateTimeISO(s.date, s.time)
  const end = new Date(start.getTime() + (s.durationMin ?? 60) * 60_000)
  return now >= start && now <= end
}

export function UpcomingSessions({ sessions = [] }: { sessions?: Session[] }) {
  const now = new Date()

  const live = sessions.filter((s) => isLiveNow(s, now))
  const upcoming = sessions
    .filter((s) => !isLiveNow(s, now))
    .sort((a, b) => {
      const aStart = parseDateTimeISO(a.date, a.time).getTime()
      const bStart = parseDateTimeISO(b.date, b.time).getTime()
      return aStart - bStart
    })

  const ordered = [...live, ...upcoming]

  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-4 md:p-6 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-foreground shrink-0 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" />
          Sessions Ã  venir
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
        {ordered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Aucune session Ã  venir pour le moment.
          </div>
        ) : (
          ordered.map((s) => {
            const liveNow = isLiveNow(s, now)
            return (
              <div
                key={s.id}
                className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-foreground text-sm">{s.title}</h4>

                  {liveNow && (
                    <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                      En direct
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="shrink-0" />
                    <span>
                      {new Date(s.date).toLocaleDateString("fr-FR")} Ã  {s.time}
                      {s.durationMin ? ` â€” ${s.durationMin} min` : null}
                    </span>
                  </div>
                  <p>
                    Formateur : <span className="text-foreground">{s.instructor}</span>
                  </p>
                </div>

                {liveNow && s.joinUrl && (
                  <div className="mt-3">
                    <a
                      href={s.joinUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Participer Ã  ${s.title}`}
                    >
                      <Radio className="w-4 h-4" />
                      Participer
                    </a>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
