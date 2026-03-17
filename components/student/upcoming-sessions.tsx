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

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]

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
        <h3 className="text-lg font-bold text-foreground shrink-0 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" />
          Sessions à venir
        </h3>
      </div>

      <div
        className="space-y-3 overflow-y-auto pr-1 -mr-1 flex-1"
        style={{ scrollbarGutter: "stable" }}
      >
        {ordered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
            Aucune session à venir pour le moment.
          </div>
        ) : (
          ordered.map((s) => {
            const liveNow = isLiveNow(s, now)
            const sessionDate = new Date(s.date)
            const day = sessionDate.getDate()
            const monthStr = MONTHS_FR[sessionDate.getMonth()]
            const dayStr = DAYS_FR[sessionDate.getDay()]

            return (
              <div
                key={s.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all
                  ${liveNow
                    ? "border-accent/40 bg-accent/5 shadow-sm shadow-accent/10"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                  }`}
              >
                {/* Date Badge */}
                <div className={`shrink-0 w-14 h-16 rounded-xl flex flex-col items-center justify-center text-center
                  ${liveNow
                    ? "bg-accent text-white"
                    : "bg-muted/60 text-foreground"
                  }`}>
                  <span className="text-lg font-bold leading-tight">{day}</span>
                  <span className="text-[10px] font-medium uppercase leading-tight">{monthStr}</span>
                  <span className="text-[9px] opacity-70 leading-tight">{dayStr}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground text-sm leading-snug truncate">{s.title}</h4>
                    {liveNow && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    <p>
                      {s.time}{s.durationMin ? ` – ${s.durationMin} min` : ""}
                    </p>
                    <p>
                      Formateur : <span className="text-foreground font-medium">{s.instructor}</span>
                    </p>
                  </div>

                  {liveNow && s.joinUrl && (
                    <a
                      href={s.joinUrl}
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg
                                 bg-accent text-white text-xs font-semibold
                                 hover:opacity-90 transition-colors
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Participer à ${s.title}`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Participer
                    </a>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
