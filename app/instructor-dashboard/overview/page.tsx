"use client"

import { useEffect, useState } from "react"
import {
  Users, CalendarDays, Clock, ExternalLink,
  TrendingUp,
  GraduationCap, Star, BookOpen, Video, Settings,
} from "lucide-react"
import { MiniWeekAgenda } from "@/components/agenda/MiniWeekAgenda"
import { KpiCard, QuickBtn, SectionCard } from "@/components/dashboard/OverviewShared"
import { OverviewSession, UpcomingSessionsPanel } from "@/components/dashboard/UpcomingSessionsPanel"
import LoadingBI from "@/components/LoadingBI"
import { CoursesSection, StudentProgram } from "@/components/student/courses-section"
import { NotificationInstallCard } from "@/components/dashboard/NotificationInstallCard"

/* ─── Types ────────────────────────────────────────────────────────────────── */
type Stats = {
  totalGroups: number
  activeGroups: number
  totalStudents: number
  todaySessions: number
  weekSessions: number
}

const EMPTY_STATS: Stats = {
  totalGroups: 0,
  activeGroups: 0,
  totalStudents: 0,
  todaySessions: 0,
  weekSessions: 0,
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
export default function InstructorOverviewPage() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [upcomingSessions, setUpcomingSessions] = useState<OverviewSession[]>([])
  const [programs, setPrograms] = useState<StudentProgram[]>([])
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
          setStats({
            totalGroups: toCount(d.stats?.totalGroups),
            activeGroups: toCount(d.stats?.activeGroups),
            totalStudents: toCount(d.stats?.totalStudents),
            todaySessions: toCount(d.stats?.todaySessions),
            weekSessions: toCount(d.stats?.weekSessions),
          })
          setUpcomingSessions(d.upcomingSessions || [])
          setPrograms(d.programs || [])
        } else {
          setStats(EMPTY_STATS)
        }
      })
      .catch(console.error)
      .finally(() => {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(500 - elapsed, 0))
      })
  }, [instructorId])

  if (loading) return <LoadingBI />

  function sessMinutesUntil(sess: { date: string; start_time: string } | null | undefined): number {
    if (!sess) return Infinity
    const [y, m, d] = sess.date.split("-").map(Number)
    const [h, min] = (sess.start_time || "00:00").split(":").map(Number)
    return (new Date(y, m - 1, d, h, min).getTime() - Date.now()) / 60000
  }
  const todayYMD = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`
  const liveSession = upcomingSessions.find(
    (s) => s.date === todayYMD && sessMinutesUntil(s) <= 5 && !!(s as any).joinUrl
  ) ?? null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir"

  const kpiCards = [
    {
      icon: Users,
      label: "Formations actives",
      value: stats.activeGroups,
      href: "/instructor-dashboard/groups",
      iconBg: "rgba(99,102,241,0.08)",
      iconColor: "#6366f1",
      badge: "TOTAL",
      badgeBg: "#e2e8f0",
      badgeColor: "#475569",
      sublabel: `sur ${stats.totalGroups}`,
    },
    {
      icon: GraduationCap,
      label: "Mes apprenants",
      value: stats.totalStudents,
      href: "/instructor-dashboard/groups",
      iconBg: "rgba(14,165,233,0.08)",
      iconColor: "#0ea5e9",
      sublabel: "inscrits",
    },
    {
      icon: CalendarDays,
      label: "Séances aujourd'hui",
      value: stats.todaySessions,
      href: "/instructor-dashboard/agenda",
      iconBg: "rgba(22,163,74,0.08)",
      iconColor: "#16a34a",
      sublabel: stats.todaySessions ? "planifiées" : "aucune",
      dot: stats.todaySessions > 0 ? "#16a34a" : undefined,
    },
    {
      icon: TrendingUp,
      label: "Séances cette semaine",
      value: stats.weekSessions,
      href: "/instructor-dashboard/agenda",
      iconBg: "rgba(245,158,11,0.08)",
      iconColor: "#f59e0b",
      sublabel: "programmées",
    },
  ]

  const quickActions = [
    { icon: Users,         label: "Mes formations",   hint: "Cohortes et planning",    href: "/instructor-dashboard/groups",   tone: "blue" },
    { icon: CalendarDays,  label: "Agenda",        hint: "Séances à venir",          href: "/instructor-dashboard/agenda",   tone: "green" },
    { icon: Settings,      label: "Parametres",    hint: "Profil et securite",        href: "/instructor-dashboard/settings", tone: "violet" },
  ] as const

  return (
    <div style={{ padding: "24px 32px", background: "#fafafa", minHeight: "100vh", fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <style>{`@keyframes livepulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "var(--ff-display,'DM Sans')" }}>
          {greeting},{" "}
          <span className="dashboard-greeting-name" style={{ color: "var(--accent,#6366f1)" }}>{instructorName}</span>
        </h1>
        <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0", fontWeight: 500 }}>
          Tableau de bord — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      <NotificationInstallCard />

      {/* Quick actions - full width */}
      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Accès rapide" icon={Star}>
          <div style={{ padding: "10px 12px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            {quickActions.map(({ icon: Icon, label, hint, href, tone }) => (
              <QuickBtn key={href} icon={Icon} label={label} hint={hint} href={href} tone={tone} />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Main content: 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        {/* Left: Mini Agenda */}
        <div>
          {instructorId && <MiniWeekAgenda instructorId={instructorId} agendaHref="/instructor-dashboard/agenda" title="Mon agenda" />}
        </div>

        {/* Right: Upcoming sessions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 16 }}>
          {liveSession ? (
            <div
              onClick={() => (liveSession as any).joinUrl && window.open((liveSession as any).joinUrl, "_blank")}
              style={{ background: "linear-gradient(135deg,color-mix(in oklch, var(--accent) 85%, black) 0%,#7c3aed 100%)", borderRadius: 16, padding: "20px 24px", position: "relative", boxShadow: "0 8px 24px color-mix(in oklch, var(--accent) 25%, transparent)", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, position: "absolute", top: 14, right: 16 }}>
                <ExternalLink size={11} color="rgba(255,255,255,0.85)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em" }}>Rejoindre</span>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", padding: "2px 10px", borderRadius: 99, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "livepulse 1.4s ease-in-out infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>SÉANCE EN COURS</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{liveSession.title || liveSession.groupTitle || "Séance de formation"}</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={11} /> {liveSession.start_time?.slice(0, 5) || "—"}
              </p>
            </div>
          ) : null}
          <UpcomingSessionsPanel sessions={upcomingSessions} href="/instructor-dashboard/agenda" />
        </div>
      </div>

      {/* Formations actives */}
      <div style={{ marginTop: 16 }}>
        <SectionCard title="Formations actives" icon={BookOpen} href="/instructor-dashboard/groups">
          <div style={{ padding: 18 }}>
            <CoursesSection showCompleted={false} programs={programs} basePath="/instructor-dashboard" />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
