"use client"

import { useEffect, useState } from "react"
import { Award, BookOpen, CalendarDays, Clock, ExternalLink, GraduationCap, Settings, Star, Users } from "lucide-react"

import { CoursesSection, StudentProgram } from "@/components/student/courses-section"
import { KpiCard, QuickBtn, SectionCard } from "@/components/dashboard/OverviewShared"
import { MiniWeekAgenda } from "@/components/agenda/MiniWeekAgenda"
import { OverviewSession, UpcomingSessionsPanel } from "@/components/dashboard/UpcomingSessionsPanel"
import LoadingBI from "@/components/LoadingBI"
import { useSetDashboardLoading } from "@/components/dashboard-loading-context"
import { MobileAppInstallAction } from "@/components/dashboard/MobileAppInstallAction"

type CoursesApiItem = {
  id: string
  slug?: string
  title: string
  shortDescription: string
  durationLabel: string
  instructorName?: string
  groupId?: string | null
  tags?: string[]
  coverImage?: string | null
  programType?: "course" | "bootcamp"
}

type StudentSessionApiItem = OverviewSession & {
  is_cancelled?: boolean
}

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default function StudentOverviewPage() {
  const [studentName, setStudentName] = useState("Etudiant")
  const [studentId, setStudentId] = useState("")
  const [programs, setPrograms] = useState<StudentProgram[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<OverviewSession[]>([])
  const [loading, setLoading] = useState(true)
  useSetDashboardLoading(loading)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const userString = localStorage.getItem("user")
      const user = userString ? JSON.parse(userString) : null
      const id = (user?.id as string | undefined) ?? ""
      const name = user?.username?.trim() || user?.email?.split("@")?.[0]?.trim() || "Etudiant"
      setStudentId(id)
      setStudentName(name)
    } catch {
      setStudentId("")
      setStudentName("Etudiant")
    }
  }, [])

  useEffect(() => {
    if (!studentId) {
      setPrograms([])
      setUpcomingSessions([])
      return
    }
    const controller = new AbortController()
    const start = Date.now()

    const load = async () => {
      try {
        const from = toYMD(new Date())
        const to = toYMD(addDays(new Date(), 60))
        const [coursesRes, sessionsRes] = await Promise.all([
          fetch(`/api/student-programs?studentId=${encodeURIComponent(studentId)}`, {
            signal: controller.signal,
          }),
          fetch(`/api/student/sessions?studentId=${encodeURIComponent(studentId)}&from=${from}&to=${to}`, {
            signal: controller.signal,
          }),
        ])

        if (coursesRes.ok) {
          const data = await coursesRes.json()
          const items = (data.programs ?? []) as CoursesApiItem[]
          setPrograms(
            items.map((c: any) => {
              const isCompleted = c.completed === true || c.status === "completed"
              return {
                id: c.id,
                slug: c.slug ?? c.id,
                title: c.title,
                shortDescription: c.shortDescription,
                durationLabel: c.durationLabel ?? "",
                instructorName: c.instructorName ?? "",
                groupId: c.groupId ?? null,
                tags: c.tags ?? [],
                image: c.coverImage ?? null,
                completed: isCompleted,
                progress: isCompleted ? 100 : 0,
                variant: c.programType ?? "course",
              }
            }),
          )
        } else {
          setPrograms([])
        }

        if (sessionsRes.ok) {
          const data = await sessionsRes.json()
          const items = ((data.sessions ?? []) as StudentSessionApiItem[])
            .filter((s) => !s.is_cancelled)
            .sort((a, b) => {
              const aKey = `${a.date}T${a.start_time || "00:00"}:00`
              const bKey = `${b.date}T${b.start_time || "00:00"}:00`
              return new Date(aKey).getTime() - new Date(bKey).getTime()
            })
          setUpcomingSessions(items)
        } else {
          setUpcomingSessions([])
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Student overview fetch error:", err)
        }
      } finally {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(500 - elapsed, 0))
      }
    }

    load()
    return () => controller.abort()
  }, [studentId])

  if (loading) return <LoadingBI />

  function sessMinutesUntil(sess: { date: string; start_time: string } | null | undefined): number {
    if (!sess) return Infinity
    const [y, m, d] = sess.date.split("-").map(Number)
    const [h, min] = (sess.start_time || "00:00").split(":").map(Number)
    return (new Date(y, m - 1, d, h, min).getTime() - Date.now()) / 60000
  }
  const todayYMD = toYMD(new Date())
  const liveSession = upcomingSessions.find(
    (s) => s.date === todayYMD && sessMinutesUntil(s) <= 5 && !!(s as any).joinUrl
  ) ?? null

  const activeCount = programs.filter((p) => !p.completed).length
  const completedCount = programs.filter((p) => p.completed).length
  const totalCount = programs.length
  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? "Bonjour" : greetingHour < 18 ? "Bon apres-midi" : "Bonsoir"

  const kpiCards = [
    {
      icon: BookOpen,
      label: "Formations actives",
      value: activeCount,
      href: "/student-dashboard/groups",
      iconBg: "rgba(99,102,241,0.08)",
      iconColor: "#6366f1",
      sublabel: "en cours",
    },
    {
      icon: GraduationCap,
      label: "Total programmes",
      value: totalCount,
      href: "/student-dashboard/groups",
      iconBg: "rgba(14,165,233,0.08)",
      iconColor: "#0ea5e9",
      sublabel: "inscrits",
    },
    {
      icon: CalendarDays,
      label: "Séances à venir",
      value: upcomingSessions.length,
      href: "/student-dashboard/agenda",
      iconBg: "rgba(22,163,74,0.08)",
      iconColor: "#16a34a",
      sublabel: "planifiées",
    },
    {
      icon: Award,
      label: "Programmes terminés",
      value: completedCount,
      href: "/student-dashboard/groups",
      iconBg: "rgba(245,158,11,0.08)",
      iconColor: "#f59e0b",
      sublabel: "validés",
    },
  ]

  const quickActions = [
    { icon: Users, label: "Mes formations", hint: "Programme de groupe", href: "/student-dashboard/groups", tone: "blue" },
    { icon: CalendarDays, label: "Agenda", hint: "Séances à venir", href: "/student-dashboard/agenda", tone: "green" },
    { icon: Settings, label: "Parametres", hint: "Profil et securite", href: "/student-dashboard/settings", tone: "violet" },
  ] as const

  return (
          <div style={{ padding: "24px 32px", background: "#fafafa", minHeight: "100vh", fontFamily: "'DM Sans','Inter',sans-serif" }}>
            <style>{`@keyframes livepulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
            <MobileAppInstallAction />
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "var(--ff-display,'DM Sans')" }}>
                {greeting},{" "}
                <span style={{ color: "var(--accent,#6366f1)" }}>{studentName}</span>
              </h1>
              <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0", fontWeight: 500 }}>
                Tableau de bord — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {kpiCards.map((card) => (
                <KpiCard key={card.label} {...card} />
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <SectionCard title="Acces rapide" icon={Star}>
                <div style={{ padding: "10px 12px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                  {quickActions.map(({ icon: Icon, label, hint, href, tone }) => (
                    <QuickBtn key={`${label}-${href}`} icon={Icon} label={label} hint={hint} href={href} tone={tone} />
                  ))}
                </div>
              </SectionCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
              <div>
                {studentId ? (
                  <MiniWeekAgenda studentId={studentId} agendaHref="/student-dashboard/agenda" title="Mon agenda" />
                ) : (
                  <SectionCard title="Mon agenda" icon={CalendarDays}>
                    <div style={{ padding: "24px 18px", textAlign: "center", fontSize: 12, color: "#475569" }}>
                      Chargement...
                    </div>
                  </SectionCard>
                )}
              </div>
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
                <UpcomingSessionsPanel sessions={upcomingSessions.slice(0, 5)} href="/student-dashboard/agenda" />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <SectionCard title="Formations actives" icon={BookOpen} href="/student-dashboard/groups">
                <div style={{ padding: 18 }}>
                  <CoursesSection showCompleted={false} programs={programs} />
                </div>
              </SectionCard>
            </div>
          </div>
  )
}
