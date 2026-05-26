"use client"

import { CalendarDays } from "lucide-react"
import { SectionCard } from "@/components/dashboard/OverviewShared"

export type OverviewSession = {
  id: string
  groupTitle?: string
  date: string
  start_time: string
  duration: number
  title: string | null
  joinUrl?: string | null
}

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function UpcomingSessionsPanel({
  sessions,
  href,
}: {
  sessions: OverviewSession[]
  href: string
}) {
  return (
    <SectionCard title="Séances à venir" icon={CalendarDays} href={href}>
      {sessions.length === 0 ? (
        <div style={{ padding: "24px 18px", textAlign: "center" }}>
          <CalendarDays size={28} color="#e2e8f0" style={{ margin: "0 auto 8px" }} />
          <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Aucune séance planifiée</p>
        </div>
      ) : (
        <div style={{ padding: "8px 0" }}>
          {sessions.map((s, idx) => {
            const sessionDate = new Date(s.date + "T00:00:00")
            const isToday = toYMD(sessionDate) === toYMD(new Date())
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 18px",
                  borderBottom: idx < sessions.length - 1 ? "1px solid #f8fafc" : "none",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbfd")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isToday ? "rgba(99,102,241,0.1)" : "#f8fafc",
                    border: `1.5px solid ${isToday ? "rgba(99,102,241,0.2)" : "#f1f5f9"}`,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: isToday ? "#6366f1" : "#0f172a", lineHeight: 1 }}>
                    {sessionDate.getDate()}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#475569", lineHeight: 1, marginTop: 1 }}>
                    {sessionDate.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title || s.groupTitle || "Séance"}
                  </p>
                  <p style={{ fontSize: 11, color: "#475569", margin: "1px 0 0" }}>
                    {s.start_time ? s.start_time.slice(0, 5) : "—"} · {Math.round(s.duration / 60)}h
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
