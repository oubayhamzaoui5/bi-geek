// components/instructor/live-sessions-panel.tsx
"use client"

import { Video, CalendarClock, Play, Users } from "lucide-react"

type Live = {
  id: string
  title:string
  course: string
  startsAt: string
  durationMin?: number
  attendees?: number
  canStartNow?: boolean
}

const MOCK: Live[] = [
  { id: "l1", title: "Bibliotheque pandas",course: "Python Data", startsAt: "2025-10-29 18:00", durationMin: 60, attendees: 34 },
  { id: "l2",  title: "Modelisation",course: "SQL", startsAt: "2025-10-31 20:00", durationMin: 45, attendees: 28 },
]

export function LiveSessionsPanel({ sessions = MOCK }: { sessions?: Live[] }) {
  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md  p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
           <Video className="text-accent" />
          Lives a venir</h2>
        <button className="px-3 py-1.5 text-sm rounded-md bg-accent hover:bg-[#7d3d9f] cursor-pointer text-white">
          Planifier
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {sessions.map(s => (
          <div key={s.id} className="p-4 rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md">
            <div className="flex items-center justify-between">
               <div className="mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Video size={18} className="text-accent" />
                  <p className="font-semibold text-foreground">{s.title}</p>
                </div>
                {/* Added course name under the title */}
                <p className="ml-4  text-sm text-muted-foreground">{s.course}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock size={16} /> {s.startsAt}
                </span>
                {typeof s.attendees === "number" && (
                  <span className="inline-flex items-center gap-1">
                    <Users size={16} /> {s.attendees}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3">
              <button className="px-3 py-1.5 text-sm rounded-md bg-accent hover:bg-[#7d3d9f] cursor-pointer text-white inline-flex items-center gap-1">
                <Play size={16} /> Démarrer
              </button>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-white/10 rounded-lg">
            Aucune session planifiée.
          </div>
        )}
      </div>
    </div>
  )
}
