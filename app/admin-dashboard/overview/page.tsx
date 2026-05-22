"use client"

import { useEffect, useState } from "react"
import {
  BookOpen, Users, Layers, ClipboardList,
  Star, CalendarDays, TrendingUp, ArrowRight,
  Clock, CheckCircle2, PhoneCall,
  AlertTriangle, Bell, KeyRound
} from "lucide-react"
import Link from "next/link"
import { MiniWeekAgenda } from "@/components/agenda/MiniWeekAgenda"
import LoadingBI from "@/components/LoadingBI"
import { MobileAppInstallAction } from "@/components/dashboard/MobileAppInstallAction"

/* ─── Types ───────────────────────────────────────────────────── */
type EnrollmentStatus = "pending" | "contacted" | "confirmed" | "cancelled"

type Enrollment = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  courseTitle?: string
  bootcampTitle?: string
  created: string
  status: string
}

type Session = {
  id: string
  groupTitle: string
  date: string
  start_time: string
  duration: number
  mode: string
  title?: string
  is_cancelled: boolean
}

type Stats = {
  totalUsers: number
  newEnrollmentsThisWeek: number
  pendingEnrollments: number
  todaySessions: number
  totalGroups: number
  totalEnrollments: number
  contactedEnrollments: number
  confirmedEnrollments: number
}

type ResetNotification = {
  id: string
  created: string
  user: {
    id: string
    name: string
    surname: string
    username: string
    email: string
    phone: string
    role: string
    avatar: string | null
  } | null
}


/* ─── Status config ───────────────────────────────────────────── */
const STATUS_CFG: Record<EnrollmentStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  pending:   { label: "En attente", color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: Clock        },
  contacted: { label: "Contacté",   color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: PhoneCall    },
  confirmed: { label: "Confirmé",   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: CheckCircle2 },
  cancelled: { label: "Annulé",     color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: AlertTriangle },
}

const NEXT_STATUS: Record<EnrollmentStatus, EnrollmentStatus> = {
  pending:   "contacted",
  contacted: "confirmed",
  confirmed: "cancelled",
  cancelled: "pending",
}

function normalizeEnrollmentStatus(status: unknown): EnrollmentStatus {
  return typeof status === "string" && status in STATUS_CFG
    ? status as EnrollmentStatus
    : "pending"
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "U"
}

function solidAvatarColor(seed: string) {
  const colors = ["#2563eb", "#db2777", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#dc2626", "#ca8a04"]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return colors[hash % colors.length]
}

/* ─── Sub-components ──────────────────────────────────────────── */

function SectionCard({ title, icon: Icon, href, hrefLabel, children }: {
  title: string; icon: React.ElementType; href?: string; hrefLabel?: string; children: React.ReactNode
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <Icon size={13} strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h2>
        </div>
        {href && (
          <Link href={href} style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 11, color: "var(--accent,#6366f1)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              {hrefLabel || "Voir tout"} <ArrowRight size={11} />
            </span>
          </Link>
        )}
      </div>
      {children}
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
        {/* Top row: icon + badge/indicator */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: iconColor, flexShrink: 0 }}>
            <Icon size={19} strokeWidth={1.8} />
          </div>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
              padding: "3px 8px", borderRadius: 99,
              background: badgeBg || "#e2e8f0", color: badgeColor || "#475569",
            }}>{badge}</span>
          )}
          {dot && !badge && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, marginTop: 4, display: "block" }} />
          )}
        </div>
        {/* Bottom: label then number */}
        <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'DM Sans')" }}>{value}</p>
          {sublabel && <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{sublabel}</span>}
        </div>
      </div>
    </Link>
  )
}

function StatusBadge({ status, onClick, disabled }: { status: string; onClick?: () => void; disabled?: boolean }) {
  const normalizedStatus = normalizeEnrollmentStatus(status)
  const cfg = STATUS_CFG[normalizedStatus]
  const Icon = cfg.icon
  return (
    <button onClick={onClick} disabled={disabled} title="Cliquer pour avancer le statut"
      style={{ cursor: disabled ? "not-allowed" : "pointer", background: "none", border: "none", padding: 0 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: 6,
        fontSize: 11, fontWeight: 700,
        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      }}>
        <Icon size={10} strokeWidth={2.5} /> {cfg.label}
      </span>
    </button>
  )
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, newEnrollmentsThisWeek: 0, pendingEnrollments: 0,
    todaySessions: 0, totalGroups: 0,
    totalEnrollments: 0, contactedEnrollments: 0, confirmedEnrollments: 0,
  })
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([])
  const [notifications, setNotifications] = useState<ResetNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState("Admin")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [resettingRequestId, setResettingRequestId] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ requestId: string; password: string } | null>(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      setAdminName(u?.username?.trim() || u?.email?.split("@")?.[0]?.trim() || "Admin")
    } catch {}
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    const sig = ctrl.signal

    async function load() {
      const start = Date.now()
      const today = new Date().toISOString().slice(0, 10)
      const nextWeek = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)

      try {
        const [usersRes, enrollmentsRes, groupsRes, sessionsRes, notificationsRes] = await Promise.all([
          fetch("/api/admin/users",       { signal: sig }).catch(() => null),
          fetch("/api/admin/enrollments", { signal: sig }).catch(() => null),
          fetch("/api/admin/groups",      { signal: sig }).catch(() => null),
          fetch(`/api/admin/sessions?from=${today}&to=${nextWeek}`, { signal: sig }).catch(() => null),
          fetch("/api/admin/notifications", { signal: sig }).catch(() => null),
        ])

        const users       = usersRes?.ok       ? await usersRes.json()       : []
        const enrollments = enrollmentsRes?.ok ? await enrollmentsRes.json() : {}
        const groups      = groupsRes?.ok      ? await groupsRes.json()      : {}
        const sessionsData = sessionsRes?.ok   ? await sessionsRes.json()    : {}
        const notificationsData = notificationsRes?.ok ? await notificationsRes.json() : {}

        const allEnrollments: Enrollment[] = Array.isArray(enrollments?.enrollments)
          ? enrollments.enrollments.map((enrollment: Enrollment) => ({
              ...enrollment,
              status: normalizeEnrollmentStatus(enrollment.status),
            }))
          : []
        const allUsers: any[] = Array.isArray(users) ? users : []
        const allSessions: Session[] = Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : []
        const allGroups: any[] = Array.isArray(groups?.groups) ? groups.groups
          : Array.isArray(groups) ? groups : []

        const sortedEnrollments = [...allEnrollments].sort(
          (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
        )

        const weekAgo = Date.now() - 7 * 864e5
        const newThisWeek = allEnrollments.filter(e => new Date(e.created).getTime() >= weekAgo).length
        const todayStr = new Date().toISOString().slice(0, 10)
        const todayCount = allSessions.filter(s => !s.is_cancelled && s.date === todayStr).length

        setRecentEnrollments(sortedEnrollments.slice(0, 10))
        setUpcomingSessions(allSessions.filter(s => !s.is_cancelled).slice(0, 5))
        setNotifications(Array.isArray(notificationsData?.notifications) ? notificationsData.notifications : [])

        setStats({
          totalUsers:             allUsers.length,
          newEnrollmentsThisWeek: newThisWeek,
          pendingEnrollments:     allEnrollments.filter(e => e.status === "pending").length,
          todaySessions:          todayCount,
          totalGroups:            allGroups.filter((g: any) => g.status === "in_progress").length,
          totalEnrollments:       allEnrollments.length,
          contactedEnrollments:   allEnrollments.filter(e => e.status === "contacted").length,
          confirmedEnrollments:   allEnrollments.filter(e => e.status === "confirmed").length,
        })
      } catch (err) {
        if ((err as Error).name !== "AbortError") console.error("Overview error:", err)
      } finally {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(400 - elapsed, 0))
      }
    }

    load()
    return () => ctrl.abort()
  }, [])

  const handleStatusChange = async (id: string, newStatus: EnrollmentStatus) => {
    setUpdatingId(id)
    const oldStatus = recentEnrollments.find(e => e.id === id)?.status
    try {
      await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      setRecentEnrollments(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e))
      if (oldStatus && oldStatus !== newStatus) {
        setStats(prev => ({
          ...prev,
          pendingEnrollments:   prev.pendingEnrollments   + (newStatus === "pending"   ? 1 : oldStatus === "pending"   ? -1 : 0),
          contactedEnrollments: prev.contactedEnrollments + (newStatus === "contacted" ? 1 : oldStatus === "contacted" ? -1 : 0),
          confirmedEnrollments: prev.confirmedEnrollments + (newStatus === "confirmed" ? 1 : oldStatus === "confirmed" ? -1 : 0),
        }))
      }
    } catch (err) { console.error(err) }
    finally { setUpdatingId(null) }
  }

  const handleResetPassword = async (request: ResetNotification) => {
    if (!request.user) return
    setResettingRequestId(request.id)
    setResetResult(null)
    try {
      const resetRes = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: request.user.id }),
      })
      const resetData = await resetRes.json().catch(() => ({}))
      if (!resetRes.ok) throw new Error(resetData?.error ?? "Erreur de réinitialisation.")

      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, status: "resolved" }),
      })

      setNotifications(prev => prev.filter(item => item.id !== request.id))
      setResetResult({ requestId: request.id, password: resetData.plainPassword })
    } catch (err) {
      console.error(err)
    } finally {
      setResettingRequestId(null)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir"

  /* ── Skeleton ── */
  if (loading) return <LoadingBI />

  const pendingCount = stats.pendingEnrollments

  return (
    <>
      <div style={{ padding: "24px 32px", background: "#fafafa", minHeight: "100vh", fontFamily: "'DM Sans','Inter',sans-serif" }}>
        <MobileAppInstallAction />

        {/* ── Header ── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "var(--ff-display,'DM Sans')" }}>
            {greeting},{" "}
            <span style={{ color: "var(--accent,#6366f1)" }}>{adminName}</span>
          </h1>
          <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0", fontWeight: 500 }}>
            Tableau de bord — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* ── 5 KPI cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          <KpiCard
            icon={Users} label="Total utilisateurs" value={stats.totalUsers}
            href="/admin-dashboard/users"
            iconBg="rgba(37,99,235,0.08)" iconColor="#2563eb"
            badge="TOTAL" badgeBg="#e2e8f0" badgeColor="#475569"
          />
          <KpiCard
            icon={ClipboardList} label="Nouvelles inscriptions" value={stats.newEnrollmentsThisWeek}
            href="/admin-dashboard/enrollments"
            iconBg="rgba(234,179,8,0.08)" iconColor="#ca8a04"
            sublabel="cette semaine"
          />
          <KpiCard
            icon={AlertTriangle} label="Inscriptions en attente" value={pendingCount}
            href="/admin-dashboard/enrollments"
            iconBg={pendingCount > 0 ? "rgba(239,68,68,0.08)" : "#f8fafc"}
            iconColor={pendingCount > 0 ? "#dc2626" : "#475569"}
            badge={pendingCount > 0 ? "URGENT" : undefined}
            badgeBg="rgba(239,68,68,0.08)" badgeColor="#dc2626"
            sublabel={pendingCount === 0 ? "aucune" : "à traiter"}
          />
          <KpiCard
            icon={CalendarDays} label="Séances aujourd'hui" value={stats.todaySessions}
            href="/admin-dashboard/agenda"
            iconBg="rgba(99,102,241,0.08)" iconColor="var(--accent,#6366f1)"
            sublabel={stats.todaySessions === 0 ? "aucune" : "planifiées"}
            dot={stats.todaySessions > 0 ? "var(--accent,#6366f1)" : undefined}
          />
          <KpiCard
            icon={Users} label="Groupes" value={stats.totalGroups}
            href="/admin-dashboard/groups"
            iconBg="#f8fafc" iconColor="#475569"
            badge="EN COURS" badgeBg="#e2e8f0" badgeColor="#475569"
          />
        </div>

        {/* ── Main 2-col layout ── */}
                {/* Quick actions - full width */}
        <div style={{ marginBottom: 16 }}>
        <SectionCard title="Accès rapide" icon={Star}>
          <div style={{ padding: "10px 12px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            {([
              { icon: BookOpen,     label: "Formations",   hint: "Catalogue et contenus",  href: "/admin-dashboard/courses",   tone: "blue"   },
              { icon: Layers,       label: "Bootcamps",    hint: "Programmes intensifs",   href: "/admin-dashboard/bootcamps", tone: "amber"  },
              { icon: Users,        label: "Utilisateurs", hint: "Comptes et rôles",        href: "/admin-dashboard/users",     tone: "violet" },
              { icon: Users,        label: "Groupes",      hint: "Cohortes et planning",    href: "/admin-dashboard/groups",    tone: "green"  },
              { icon: CalendarDays, label: "Agenda",       hint: "Sessions à venir",        href: "/admin-dashboard/agenda",    tone: "indigo" },
              { icon: ClipboardList, label: "Inscription",  hint: "Sélection de la page",    href: "/admin-dashboard/enrollments", tone: "rose"   },
            ] as QuickActionItem[]).map(({ icon: Icon, label, hint, href, tone }) => {
              return (
                <QuickBtn key={href} icon={Icon} label={label} hint={hint} href={href} tone={tone} />
              )
            })}
          </div>
        </SectionCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>

          {/* ── Left: Agenda + Enrollments ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionCard title="Inscriptions récentes" icon={TrendingUp} href="/admin-dashboard/enrollments" hrefLabel="Voir tout">
              {recentEnrollments.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <ClipboardList size={32} color="#e2e8f0" style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", margin: 0 }}>Aucune inscription</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 290px 130px", padding: "9px 20px", borderBottom: "1px solid #f8fafc", background: "#fafbfd" }}>
                    {["Candidat", "Formation", "Statut"].map(h => (
                      <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</span>
                    ))}
                  </div>
                  {recentEnrollments.slice(0, 6).map((enr, idx, arr) => {
                    const name = `${enr.firstName} ${enr.lastName}`.trim() || enr.email
                    const subject = enr.courseTitle || enr.bootcampTitle || "—"
                    const isUpdating = updatingId === enr.id
                    return (
                      <div key={enr.id}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr 290px 130px",
                          padding: "12px 20px",
                          borderBottom: idx < arr.length - 1 ? "1px solid #f8fafc" : "none",
                          alignItems: "center", transition: "background 0.12s",
                          opacity: isUpdating ? 0.55 : 1,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ minWidth: 0, paddingRight: 12 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                          <p style={{ fontSize: 11, color: "#475569", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{enr.phone || "—"}</p>
                        </div>
                        <div style={{ minWidth: 0, paddingRight: 12 }}>
                          <p style={{ fontSize: 14, color: "#334155", fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subject}</p>
                          <p style={{ fontSize: 11, color: "#475569", margin: "1px 0 0" }}>
                            {new Date(enr.created).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                        <div>
                          <StatusBadge
                            status={enr.status}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(enr.id, NEXT_STATUS[normalizeEnrollmentStatus(enr.status)])}
                          />
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </SectionCard>
            <MiniWeekAgenda agendaHref="/admin-dashboard/agenda" />


          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 16 }}>

            {/* Notifications */}
            <RealNotificationsCard
              notifications={notifications}
              resettingRequestId={resettingRequestId}
              resetResult={resetResult}
              onResetPassword={handleResetPassword}
            />

            {/* Upcoming sessions */}
            <SectionCard title="Sessions à venir" icon={CalendarDays} href="/admin-dashboard/agenda">
              {upcomingSessions.length === 0 ? (
                <div style={{ padding: "24px 18px", textAlign: "center" }}>
                  <CalendarDays size={28} color="#e2e8f0" style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Aucune session planifiée</p>
                </div>
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {upcomingSessions.map((s, idx) => {
                    const isToday = s.date === new Date().toISOString().slice(0, 10)
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
                            {new Date(s.date).getDate()}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: "#475569", lineHeight: 1, marginTop: 1 }}>
                            {new Date(s.date).toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.title || s.groupTitle || "Session"}
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


          </div>
        </div>      </div>
    </>
  )
}

/* ─── Static notifications data ───────────────────────────────── */
function RealNotificationsCard({
  notifications,
  resettingRequestId,
  resetResult,
  onResetPassword,
}: {
  notifications: ResetNotification[]
  resettingRequestId: string | null
  resetResult: { requestId: string; password: string } | null
  onResetPassword: (request: ResetNotification) => void
}) {
  return (
    <SectionCard title="Notifications" icon={Bell}>
      <div style={{ padding: notifications.length ? "4px 0" : 0 }}>
        {resetResult && (
          <div style={{ margin: "12px 14px 8px", padding: "10px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#166534", fontWeight: 700 }}>Mot de passe temporaire généré</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#0f172a", fontWeight: 800, fontFamily: "monospace" }}>{resetResult.password}</p>
          </div>
        )}
        {notifications.length === 0 ? (
          <div style={{ padding: "28px 18px", textAlign: "center" }}>
            <Bell size={26} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Aucune demande de réinitialisation.</p>
          </div>
        ) : notifications.map((n, idx) => {
          const user = n.user
          const displayName = user ? `${user.name} ${user.surname}`.trim() || user.username || user.email : "Utilisateur supprimé"
          const phone = user?.phone || "Mobile non renseigné"
          const isResetting = resettingRequestId === n.id

          return (
            <div key={n.id} style={{
              display: "grid", gridTemplateColumns: "40px 1fr auto", alignItems: "center", gap: 10, padding: "12px 14px",
              borderBottom: idx < notifications.length - 1 ? "1px solid #f1f5f9" : "none",
            }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="" style={{ width: 38, height: 38, borderRadius: 99, objectFit: "cover", border: "2px solid #f1f5f9" }} />
              ) : (
                <div style={{
                  width: 38, height: 38, borderRadius: 99,
                  background: solidAvatarColor(user?.id || displayName),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff",
                }}>
                  {userInitials(displayName)}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </p>
                <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {phone}
                </p>
              </div>
              <button
                type="button"
                disabled={!user || isResetting}
                onClick={() => onResetPassword(n)}
                style={{
                  height: 32, padding: "0 10px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.28)",
                  background: isResetting ? "#f8fafc" : "rgba(99,102,241,0.08)",
                  color: "var(--accent,#6366f1)", fontSize: 11, fontWeight: 800,
                  display: "inline-flex", alignItems: "center", gap: 5,
                  cursor: !user || isResetting ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <KeyRound size={12} />
                {isResetting ? "..." : "Reset password"}
              </button>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

/* ─── NotificationsCard ────────────────────────────────────────── */
function NotificationsCard({
  notifications,
  resettingRequestId,
  resetResult,
  onResetPassword,
}: {
  notifications: ResetNotification[]
  resettingRequestId: string | null
  resetResult: { requestId: string; password: string } | null
  onResetPassword: (request: ResetNotification) => void
}) {
  return (
    <SectionCard title="Notifications" icon={Bell}>
      <div>
        {([] as Array<{ id: string; firstName: string; lastName: string; username: string }>).map((n, idx) => (
          <div key={n.id} style={{
            display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 16px",
            borderBottom: "none",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 99, flexShrink: 0,
              background: "rgba(99,102,241,0.1)", border: "1.5px solid rgba(99,102,241,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#4f46e5",
            }}>
              {n.firstName[0]}{n.lastName[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {n.firstName} {n.lastName}
              </p>
              <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 4px" }}>
                @{n.username}
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 8px", borderRadius: 6,
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              }}>
                <KeyRound size={10} color="#d97706" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#d97706" }}>
                  Demande de réinitialisation de mot de passe
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
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
  blue:   { iconBg: "#3b82f6", iconColor: "#fff", borderHover: "rgba(59,130,246,0.32)", shadowHover: "0 8px 20px rgba(37,99,235,0.12)" },
  amber:  { iconBg: "#f59e0b", iconColor: "#fff", borderHover: "rgba(245,158,11,0.34)", shadowHover: "0 8px 20px rgba(217,119,6,0.12)" },
  violet: { iconBg: "#8b5cf6", iconColor: "#fff", borderHover: "rgba(139,92,246,0.34)", shadowHover: "0 8px 20px rgba(124,58,237,0.12)" },
  green:  { iconBg: "#22c55e", iconColor: "#fff", borderHover: "rgba(34,197,94,0.34)", shadowHover: "0 8px 20px rgba(22,163,74,0.12)" },
  indigo: { iconBg: "#6366f1", iconColor: "#fff", borderHover: "rgba(99,102,241,0.34)", shadowHover: "0 8px 20px rgba(79,70,229,0.12)" },
  rose:   { iconBg: "#f43f5e", iconColor: "#fff", borderHover: "rgba(244,63,94,0.34)", shadowHover: "0 8px 20px rgba(225,29,72,0.12)" },
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
          cursor: "pointer", transition: "all 0.18s ease",
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
              fontSize: 11, lineHeight: 1.2, color: "#475569", margin: "4px 0 0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {hint}
            </p>
          </div>
        </div>
        <ArrowRight
          size={14}
          style={{
            flexShrink: 0,
            color: hover ? style.iconColor : "#475569",
            transform: hover ? "translateX(2px)" : "translateX(0)",
            transition: "all 0.18s ease",
          }}
        />
      </div>
    </Link>
  )
}
