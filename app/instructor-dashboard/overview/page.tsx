"use client"

import { useEffect, useState } from "react"
import {
  Users, CalendarDays, ArrowRight,
  TrendingUp, MessageSquare,
  GraduationCap, Star,
  Wifi, MapPin, MonitorSmartphone, HelpCircle,
} from "lucide-react"
import Link from "next/link"
import { MiniWeekAgenda } from "@/components/agenda/MiniWeekAgenda"

const MODE_ICON: Record<string, React.ElementType> = {
  live: Wifi,
  presentiel: MapPin,
  live_presentiel: MonitorSmartphone,
  not_set: HelpCircle,
}

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/* â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type Stats = {
  totalGroups: number
  activeGroups: number
  totalStudents: number
  todaySessions: number
  weekSessions: number
}

type Session = {
  id: string
  groupTitle: string
  date: string
  start_time: string
  duration: number
  mode: string
  title: string | null
  is_cancelled: boolean
}



/* â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function InstructorOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([])
  const [instructorId, setInstructorId] = useState<string>("")
  const [instructorName, setInstructorName] = useState<string>("Formateur")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      const u = raw ? JSON.parse(raw) : null
      if (u?.id) setInstructorId(u.id)
      if (u?.username) setInstructorName(u.username)
    } catch {}
  }, [])

  useEffect(() => {
    if (!instructorId) return
    const start = Date.now()
    fetch(`/api/instructor/overview?instructorId=${instructorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setStats(d.stats)
          setUpcomingSessions(d.upcomingSessions || [])
        }
      })
      .catch(console.error)
      .finally(() => {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(500 - elapsed, 0))
      })
  }, [instructorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100vh]">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-6 border-accent/20 border-t-accent animate-spin" />
          <span className="text-3xl font-bold text-accent">BI</span>
        </div>
      </div>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon aprÃ¨s-midi" : "Bonsoir"

  const kpiCards = [
    {
      icon: Users,
      label: "Mes groupes",
      value: stats?.totalGroups ?? 0,
      href: "/instructor-dashboard/groups",
      iconBg: "rgba(99,102,241,0.08)",
      iconColor: "#6366f1",
      badge: "ACTIFS",
      badgeBg: "#f1f5f9",
      badgeColor: "#94a3b8",
      sublabel: `${stats?.activeGroups ?? 0}`,
    },
    {
      icon: GraduationCap,
      label: "Mes Ã©tudiants",
      value: stats?.totalStudents ?? 0,
      href: "/instructor-dashboard/groups",
      iconBg: "rgba(14,165,233,0.08)",
      iconColor: "#0ea5e9",
      sublabel: "inscrits",
    },
    {
      icon: CalendarDays,
      label: "Sessions aujourd'hui",
      value: stats?.todaySessions ?? 0,
      href: "/instructor-dashboard/agenda",
      iconBg: "rgba(22,163,74,0.08)",
      iconColor: "#16a34a",
      sublabel: stats?.todaySessions ? "planifiÃ©es" : "aucune",
      dot: (stats?.todaySessions ?? 0) > 0 ? "#16a34a" : undefined,
    },
    {
      icon: TrendingUp,
      label: "Sessions cette semaine",
      value: stats?.weekSessions ?? 0,
      href: "/instructor-dashboard/agenda",
      iconBg: "rgba(245,158,11,0.08)",
      iconColor: "#f59e0b",
      sublabel: "programmÃ©es",
    },
  ]

  const quickActions = [
    { icon: Users,         label: "Mes groupes",   hint: "Cohortes et planning",    href: "/instructor-dashboard/groups",   tone: "blue" },
    { icon: GraduationCap, label: "Mes Ã©tudiants", hint: "Suivi des apprenants",    href: "/instructor-dashboard/students", tone: "violet" },
    { icon: CalendarDays,  label: "Agenda",        hint: "Sessions Ã  venir",         href: "/instructor-dashboard/agenda",   tone: "green" },
    { icon: MessageSquare, label: "Messages",      hint: "Discussions et support",   href: "/instructor-dashboard/messages", tone: "amber" },
  ] as QuickActionItem[]

  return (
    <div style={{ padding: "24px 32px", background: "#fafafa", minHeight: "100vh", fontFamily: "'DM Sans','Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "var(--ff-display,'DM Sans')" }}>
          {greeting},{" "}
          <span style={{ color: "var(--accent,#6366f1)" }}>{instructorName}</span>
        </h1>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "3px 0 0", fontWeight: 500 }}>
          Tableau de bord â€” {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Quick actions - full width */}
      <div style={{ marginBottom: 16 }}>
        <SectionCard title="AccÃ¨s rapide" icon={Star}>
          <div style={{ padding: "10px 12px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            {quickActions.map(({ icon: Icon, label, hint, href, tone }) => (
              <QuickBtn key={href} icon={Icon} label={label} hint={hint} href={href} tone={tone} />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Main content: 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Left: Mini Agenda */}
        <div>
          {instructorId && <MiniWeekAgenda instructorId={instructorId} agendaHref="/instructor-dashboard/agenda" title="Mon agenda" />}
        </div>

        {/* Right: Upcoming sessions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Upcoming sessions */}
          <SectionCard title="Sessions à venir" icon={CalendarDays} href="/instructor-dashboard/agenda">
            {upcomingSessions.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center" }}>
                <CalendarDays size={28} color="#e2e8f0" style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Aucune session planifiée</p>
              </div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {upcomingSessions.map((s, idx) => {
                  const ModeIcon = MODE_ICON[s.mode] || CalendarDays
                  const sessionDate = new Date(s.date + "T00:00:00")
                  const isToday = toYMD(sessionDate) === toYMD(new Date())
                  return (
                    <div key={s.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 11,
                        padding: "9px 18px",
                        borderBottom: idx < upcomingSessions.length - 1 ? "1px solid #f8fafc" : "none",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        background: isToday ? "rgba(99,102,241,0.1)" : "#f8fafc",
                        border: `1.5px solid ${isToday ? "rgba(99,102,241,0.2)" : "#f1f5f9"}`,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: isToday ? "#6366f1" : "#0f172a", lineHeight: 1 }}>
                          {sessionDate.getDate()}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", lineHeight: 1, marginTop: 1 }}>
                          {sessionDate.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.title || s.groupTitle || "Session"}
                        </p>
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: "1px 0 0" }}>
                          {s.start_time ? s.start_time.slice(0, 5) : "—"} · {Math.round(s.duration / 60)}h
                        </p>
                      </div>
                      <ModeIcon size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, href, iconBg, iconColor, badge, badgeColor, badgeBg, sublabel, dot }: {
  icon: React.ElementType; label: string; value: number | string; href: string
  iconBg: string; iconColor: string
  badge?: string; badgeColor?: string; badgeBg?: string
  sublabel?: string; dot?: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: "#fff", borderRadius: 16, border: `1px solid ${hover ? "#e2e8f0" : "#f1f5f9"}`,
          padding: "18px 20px", display: "flex", flexDirection: "column",
          gap: 0, cursor: "pointer", transition: "all 0.15s",
          boxShadow: hover ? "0 6px 20px rgba(0,0,0,0.07)" : "0 1px 3px rgba(0,0,0,0.04)",
          minHeight: 110,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: iconColor, flexShrink: 0 }}>
            <Icon size={19} strokeWidth={1.8} />
          </div>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
              padding: "3px 8px", borderRadius: 99,
              background: badgeBg || "#f1f5f9", color: badgeColor || "#94a3b8",
            }}>{badge}</span>
          )}
          {dot && !badge && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, marginTop: 4, display: "block" }} />
          )}
        </div>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'DM Sans')" }}>{value}</p>
          {sublabel && <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{sublabel}</span>}
        </div>
      </div>
    </Link>
  )
}

type QuickActionItem = {
  icon: React.ElementType
  label: string
  hint: string
  href: string
  tone: "blue" | "amber" | "violet" | "green" | "indigo" | "rose"
}

const QUICK_BTN_STYLES: Record<
  QuickActionItem["tone"],
  { iconBg: string; iconColor: string; borderHover: string; shadowHover: string }
> = {
  blue:   { iconBg: "rgba(59,130,246,0.14)", iconColor: "#2563eb", borderHover: "rgba(59,130,246,0.32)", shadowHover: "0 8px 20px rgba(37,99,235,0.12)" },
  amber:  { iconBg: "rgba(245,158,11,0.14)", iconColor: "#d97706", borderHover: "rgba(245,158,11,0.34)", shadowHover: "0 8px 20px rgba(217,119,6,0.12)" },
  violet: { iconBg: "rgba(139,92,246,0.14)", iconColor: "#7c3aed", borderHover: "rgba(139,92,246,0.34)", shadowHover: "0 8px 20px rgba(124,58,237,0.12)" },
  green:  { iconBg: "rgba(34,197,94,0.14)", iconColor: "#16a34a", borderHover: "rgba(34,197,94,0.34)", shadowHover: "0 8px 20px rgba(22,163,74,0.12)" },
  indigo: { iconBg: "rgba(99,102,241,0.14)", iconColor: "#4f46e5", borderHover: "rgba(99,102,241,0.34)", shadowHover: "0 8px 20px rgba(79,70,229,0.12)" },
  rose:   { iconBg: "rgba(244,63,94,0.14)", iconColor: "#e11d48", borderHover: "rgba(244,63,94,0.34)", shadowHover: "0 8px 20px rgba(225,29,72,0.12)" },
}

function QuickBtn({ icon: Icon, label, hint, href, tone }: QuickActionItem) {
  const [hover, setHover] = useState(false)
  const style = QUICK_BTN_STYLES[tone]

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "14px 12px", borderRadius: 12, minHeight: 78,
          border: `1.5px solid ${hover ? style.borderHover : "#e2e8f0"}`,
          background: hover ? "#ffffff" : "#f8fafc",
          boxShadow: hover ? style.shadowHover : "none",
          cursor: "pointer",
          transition: "all 0.18s ease",
          transform: hover ? "translateY(-1px)" : "translateY(0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: style.iconBg,
            color: style.iconColor,
            transition: "all 0.18s ease",
          }}>
            <Icon size={15} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, lineHeight: 1.15, fontWeight: 700, color: "#0f172a", margin: 0 }}>{label}</p>
            <p style={{
              fontSize: 11, lineHeight: 1.2, color: "#64748b", margin: "4px 0 0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {hint}
            </p>
          </div>
        </div>
        <ArrowRight size={14} color={hover ? "#334155" : "#94a3b8"} style={{ flexShrink: 0, transition: "color 0.18s ease" }} />
      </div>
    </Link>
  )
}

function SectionCard({
  title,
  icon: Icon,
  href,
  hrefLabel = "Voir",
  children,
}: {
  title: string
  icon: React.ElementType
  href?: string
  hrefLabel?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent,#6366f1)" }}>
            <Icon size={13} strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h2>
        </div>
        {href ? (
          <Link href={href} style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 11, color: "var(--accent,#6366f1)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              {hrefLabel} <ArrowRight size={11} />
            </span>
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  )
}


