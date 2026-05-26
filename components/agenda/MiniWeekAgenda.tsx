"use client"

import { useEffect, useRef, useState } from "react"
import {
  CalendarDays, ChevronLeft, ChevronRight, ArrowRight, Loader2,
} from "lucide-react"
import Link from "next/link"
import { getAgendaHourRange } from "./timeRange"

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]
const SLOT_H = 44

const GROUP_COLORS = [
  "#2563EB", "#F59E0B", "#16A34A", "#8B5CF6",
  "#EAB308", "#0D9488", "#A16207", "#4B5563", "#65A30D", "#0369A1",
]

// ── Types ──────────────────────────────────────────────────────────────────────

type AgSession = {
  id: string | null
  group: string
  groupTitle: string
  date: string
  start_time: string
  duration: number
  mode: string
  title: string | null
  is_cancelled: boolean
  virtual?: boolean
}

type AgGroup = { id: string; title: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function parseTime(t: string): number {
  if (!t) return 9 * 60
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  return m > 0 ? `${h}h${m}` : `${h}h`
}

function computeColumns(sessions: AgSession[]): Map<string, { col: number; totalCols: number }> {
  const indexed = sessions.map((s, i) => ({
    key: s.id ?? `__v${i}`,
    start: parseTime(s.start_time),
    end: parseTime(s.start_time) + Math.max(s.duration, 1),
  }))
  const cols: number[] = new Array(indexed.length).fill(0)
  const colEnd: number[] = []
  for (let i = 0; i < indexed.length; i++) {
    let col = 0
    while (colEnd[col] !== undefined && colEnd[col] > indexed[i].start) col++
    cols[i] = col
    colEnd[col] = indexed[i].end
  }
  const result = new Map<string, { col: number; totalCols: number }>()
  for (let i = 0; i < indexed.length; i++) {
    let maxCol = cols[i]
    for (let j = 0; j < indexed.length; j++) {
      if (i !== j && indexed[i].start < indexed[j].end && indexed[j].start < indexed[i].end)
        maxCol = Math.max(maxCol, cols[j])
    }
    result.set(indexed[i].key, { col: cols[i], totalCols: maxCol + 1 })
  }
  return result
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface MiniWeekAgendaProps {
  /** When set, uses instructor APIs (read from /api/instructor/*). Otherwise uses admin APIs. */
  instructorId?: string
  /** When set, uses student APIs (read from /api/student/*). */
  studentId?: string
  /** href for the "Ouvrir" link in the header */
  agendaHref: string
  /** Header title (defaults to "Agenda") */
  title?: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MiniWeekAgenda({ instructorId, studentId, agendaHref, title = "Agenda" }: MiniWeekAgendaProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [sessions, setSessions] = useState<AgSession[]>([])
  const [groupMap, setGroupMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mode = instructorId ? "instructor" : studentId ? "student" : "admin"

  function getSessionHref(s: AgSession): string {
    if (mode === "instructor") return `/instructor-dashboard/groups/${s.group}`
    if (mode === "student") return `/student-dashboard/groups/${s.group}`
    return `${agendaHref}?group=${s.group}&date=${s.date}&start_time=${s.start_time}`
  }

  useEffect(() => () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current) }, [])

  function onEnter(key: string) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoveredKey(key)
  }
  function onLeave() {
    hoverTimerRef.current = setTimeout(() => setHoveredKey(null), 300)
  }

  // Fetch groups for color map
  useEffect(() => {
    if (mode === "instructor" && !instructorId) return
    if (mode === "student" && !studentId) return

    const url =
      mode === "instructor"
        ? `/api/instructor/groups?instructorId=${instructorId}`
        : mode === "student"
          ? `/api/student/groups?studentId=${studentId}`
          : "/api/admin/groups"

    fetch(url)
      .then(r => r.json())
      .then(d => {
        const gs: AgGroup[] = (d.groups || [])
        const map = new Map(gs.map((g, i) => [g.id, GROUP_COLORS[i % GROUP_COLORS.length]]))
        setGroupMap(map)
      })
      .catch(() => {})
  }, [instructorId, mode, studentId])

  // Fetch sessions when week changes
  useEffect(() => {
    if (mode === "instructor" && !instructorId) return
    if (mode === "student" && !studentId) return

    const from = toYMD(weekStart)
    const to = toYMD(addDays(weekStart, 6))
    setLoading(true)
    const url =
      mode === "instructor"
        ? `/api/instructor/sessions?instructorId=${instructorId}&from=${from}&to=${to}`
        : mode === "student"
          ? `/api/student/sessions?studentId=${studentId}&from=${from}&to=${to}`
          : `/api/admin/sessions?from=${from}&to=${to}`

    fetch(url)
      .then(r => r.json())
      .then(d => setSessions(d.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [weekStart, instructorId, mode, studentId])

  const today = toYMD(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const { startHour, endHour, hours } = getAgendaHourRange(sessions, { defaultStartHour: 7, defaultEndHour: 21 })
  const weekEnd = addDays(weekStart, 6)
  const isThisWeek = toYMD(getWeekStart(new Date())) === toYMD(weekStart)

  const periodLabel = (() => {
    if (weekStart.getMonth() === weekEnd.getMonth())
      return `${weekStart.getDate()} – ${weekEnd.getDate()} ${MONTHS_FR[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    return `${weekStart.getDate()} ${MONTHS_FR[weekStart.getMonth()].slice(0, 3)} – ${weekEnd.getDate()} ${MONTHS_FR[weekEnd.getMonth()].slice(0, 3)} ${weekStart.getFullYear()}`
  })()

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <CalendarDays size={13} strokeWidth={2} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h2>
            <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{periodLabel}</span>
            {loading && <Loader2 size={12} color="#475569" className="animate-spin" />}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isThisWeek && (
            <button
              onClick={() => setWeekStart(getWeekStart(new Date()))}
              style={{ fontSize: 11, fontWeight: 600, color: "var(--accent,#6366f1)", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 7, padding: "3px 9px", cursor: "pointer" }}
            >
              Aujourd'hui
            </button>
          )}
          <button
            onClick={() => setWeekStart(p => addDays(p, -7))}
            style={{ width: 26, height: 26, borderRadius: 7, border: "1.5px solid #f1f5f9", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setWeekStart(p => addDays(p, 7))}
            style={{ width: 26, height: 26, borderRadius: 7, border: "1.5px solid #f1f5f9", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
          >
            <ChevronRight size={13} />
          </button>
          <Link href={agendaHref} style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 11, color: "var(--accent,#6366f1)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              Ouvrir <ArrowRight size={11} />
            </span>
          </Link>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ width: 38, flexShrink: 0, borderRight: "1px solid #f1f5f9" }} />
        {days.map((d, i) => {
          const isToday = toYMD(d) === today
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 4px", borderRight: i < 6 ? "1px solid #f1f5f9" : undefined }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{DAYS_FR[i]}</span>
              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, background: isToday ? "var(--accent,#6366f1)" : "transparent" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#fff" : "#0f172a" }}>{d.getDate()}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div>
        <div style={{ display: "flex", minHeight: `${(endHour - startHour) * SLOT_H}px` }}>
          {/* Hour gutter */}
          <div style={{ width: 38, flexShrink: 0, borderRight: "1px solid #f1f5f9", position: "relative" }}>
            {hours.map(h => (
              <div key={h} style={{ position: "absolute", right: 6, top: (h - startHour) * SLOT_H - 5, fontSize: 9, color: "#cbd5e1", fontWeight: 600, lineHeight: 1 }}>
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const ymd = toYMD(d)
            const daySessions = sessions.filter(s => s.date === ymd)
            const colMap = computeColumns(daySessions)

            const hoveredSession = hoveredKey ? daySessions.find((s, i) => (s.id ?? `__v${i}`) === hoveredKey) : null
            const hoveredMeta = hoveredKey ? colMap.get(hoveredKey) : undefined
            const hoveredStart = hoveredSession ? parseTime(hoveredSession.start_time) : null
            const hoveredEnd = hoveredSession ? hoveredStart! + Math.max(hoveredSession.duration, 1) : null

            return (
              <div key={di} style={{ flex: 1, position: "relative", borderRight: di < 6 ? "1px solid #f1f5f9" : undefined }}>
                {/* Hour lines */}
                {hours.map(h => (
                  <div key={h} style={{ position: "absolute", left: 0, right: 0, top: (h - startHour) * SLOT_H, borderTop: "1px solid #f8fafc" }} />
                ))}
                {/* Half-hour lines */}
                {hours.map(h => (
                  <div key={`hh-${h}`} style={{ position: "absolute", left: 0, right: 0, top: (h - startHour) * SLOT_H + SLOT_H / 2, borderTop: "1px solid #fafafa" }} />
                ))}

                {/* Sessions */}
                {daySessions.map((s, si) => {
                  const sessionKey = s.id ?? `__v${si}`
                  const startMin = parseTime(s.start_time)
                  const top = ((startMin - startHour * 60) / 60) * SLOT_H
                  const height = Math.max((s.duration / 60) * SLOT_H, 22)
                  const { col, totalCols } = colMap.get(sessionKey) ?? { col: 0, totalCols: 1 }
                  const isHovered = hoveredKey === sessionKey

                  const start = startMin
                  const end = start + Math.max(s.duration, 1)
                  const overlapsHovered =
                    hoveredSession && hoveredStart !== null && hoveredEnd !== null &&
                    start < hoveredEnd && hoveredStart < end

                  let widthPct = 100 / totalCols
                  let leftPct = col * widthPct

                  if (overlapsHovered && hoveredMeta && totalCols > 1 && hoveredMeta.totalCols === totalCols) {
                    const expandedPct = Math.min(70, Math.max(52, 100 - (totalCols - 1) * 14))
                    const otherPct = (100 - expandedPct) / (totalCols - 1)
                    if (isHovered) {
                      widthPct = expandedPct
                      leftPct = hoveredMeta.col * otherPct
                    } else {
                      widthPct = otherPct
                      leftPct = col < hoveredMeta.col ? col * otherPct : col * otherPct + (expandedPct - otherPct)
                    }
                  }

                  const gc = groupMap.get(s.group) ?? "#475569"
                  const isCancelled = s.is_cancelled
                  const bg = isCancelled ? "#f3f4f6" : gc
                  const border = isCancelled ? "#fecaca" : gc
                  const primaryText = isCancelled ? "#dc2626" : "#ffffff"
                  const subText = isCancelled ? "#ef4444" : "rgba(255,255,255,0.92)"

                  return (
                    <button
                      key={si}
                      onClick={() => { window.location.href = getSessionHref(s) }}
                      onMouseEnter={() => onEnter(sessionKey)}
                      onMouseLeave={onLeave}
                      style={{
                        position: "absolute",
                        top: top + 1,
                        height: Math.max(height - 2, 20),
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        zIndex: isHovered ? 20 : 1,
                        background: bg,
                        border: `1.5px solid ${border}`,
                        borderRadius: 6,
                        padding: "3px 5px",
                        textAlign: "left",
                        cursor: "pointer",
                        overflow: "hidden",
                        boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.18)" : "0 1px 3px rgba(0,0,0,0.12)",
                        filter: isHovered ? "brightness(0.93)" : "brightness(1)",
                        transition: "left 120ms ease, width 120ms ease, box-shadow 120ms ease, filter 120ms ease",
                      }}
                    >
                      <p style={{
                        fontSize: 10, fontWeight: 700, color: primaryText,
                        margin: 0, lineHeight: 1.3,
                        overflow: "hidden",
                        maxHeight: isHovered ? "6em" : "1.3em",
                        transition: "max-height 180ms ease",
                        wordBreak: "break-word",
                      }}>
                        {s.title || s.groupTitle}
                      </p>
                      {height > 34 && (
                        <p style={{ fontSize: 9, color: subText, margin: "1px 0 0", lineHeight: 1.2 }}>
                          {s.start_time} · {fmtDuration(s.duration)}
                        </p>
                      )}
                      {s.virtual && (
                        <div style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: isCancelled ? "#ef4444" : "#fff", opacity: 0.4 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
