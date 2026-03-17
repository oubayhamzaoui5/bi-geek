"use client"

import { useEffect, useState } from "react"
import { BookOpen, Award, Clock, TrendingUp } from "lucide-react"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { WelcomeSection } from "@/components/welcome-section"
import { CoursesSection, StudentProgram } from "@/components/student/courses-section"
import { UpcomingSessions, Session } from "@/components/student/upcoming-sessions"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import { RecentAnnouncements, Announcement } from "@/components/student/recent-announcements"
import { ProgressOverview } from "@/components/student/progress-overview"
import { SidebarProvider } from "@/components/ui/sidebar-context"

type CoursesApiItem = {
  id: string
  slug?: string
  title: string
  shortDescription: string
  durationLabel: string
  tags?: string[]
  coverImage?: string | null
  programType?: "course" | "bootcamp"
}

/* ---------- KPI Card ---------- */
function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-4 transition-all
        ${accent
          ? "border-accent/30 bg-accent/5 shadow-sm shadow-accent/10"
          : "border-border bg-card/90 backdrop-blur"
        }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
          ${accent
            ? "bg-accent/15 text-accent"
            : "bg-muted text-muted-foreground"
          }`}
      >
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/* ---------- Main Page ---------- */
export default function Dashboard() {
  const [studentName, setStudentName] = useState("Étudiant")
  const [programs, setPrograms] = useState<StudentProgram[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        let studentId = ""
        try {
          const userString = typeof window !== "undefined" ? localStorage.getItem("user") : null
          const user = userString ? JSON.parse(userString) : null
          studentId = (user?.id as string | undefined) ?? ""
        } catch {
          studentId = ""
        }

        const [coursesRes, dashboardRes] = await Promise.all([
          fetch(`/api/student-programs?studentId=${encodeURIComponent(studentId)}`, {
            signal: controller.signal,
          }),
          fetch("/api/student-dashboard", { signal: controller.signal }),
        ])

        if (coursesRes.ok) {
          const data = await coursesRes.json()
          const items = (data.programs ?? []) as CoursesApiItem[]
          setPrograms(
            items.map((c) => ({
              id: c.id,
              slug: c.slug ?? c.id,
              title: c.title,
              shortDescription: c.shortDescription,
              durationLabel: c.durationLabel ?? "",
              tags: c.tags ?? [],
              image: c.coverImage ?? null,
              completed: false,
              variant: c.programType ?? "course",
            })),
          )
        }

        if (dashboardRes.ok) {
          const data = await dashboardRes.json()
          setSessions((data.sessions ?? []) as Session[])
          setAnnouncements((data.announcements ?? []) as Announcement[])
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Student dashboard fetch error:", err)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const userString = localStorage.getItem("user")
      const user = userString ? JSON.parse(userString) : null
      const name =
        user?.username?.trim() ||
        user?.email?.split("@")?.[0]?.trim() ||
        "Étudiant"
      setStudentName(name)
    } catch {
      setStudentName("Étudiant")
    }
  }, [])

  // Compute KPI stats
  const activeCount = programs.filter((p) => !p.completed).length
  const completedCount = programs.filter((p) => p.completed).length
  const totalProgress = programs.length > 0
    ? Math.round((completedCount / programs.length) * 100)
    : 0

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Header variant="student" announcementCount={announcements.length} />
          <div className="p-4 md:p-8 space-y-6">
            <WelcomeSection name={studentName} variant="student" />

            {/* KPI Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatCard icon={BookOpen} label="Formations actives" value={activeCount} accent />
              <StatCard icon={Award} label="Terminées" value={completedCount} />
              <StatCard icon={Clock} label="Sessions à venir" value={sessions.length} />
              <StatCard icon={TrendingUp} label="Progression" value={`${totalProgress}%`} accent />
            </div>

            {/* Main content: 3-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Sessions */}
              <div className="lg:col-span-2">
                <UpcomingSessions sessions={sessions} />
              </div>

              {/* Right: Announcements + Progress */}
              <div className="space-y-6">
                <RecentAnnouncements announcements={announcements} />
                <ProgressOverview
                  totalProgress={totalProgress}
                  activeCourses={activeCount}
                  certificates={completedCount}
                  learningHours={activeCount * 20}
                />
              </div>
            </div>

            {/* Courses Grid */}
            <CoursesSection showCompleted={false} programs={programs} />
            <div className="mb-8" />
            <CoursesSection showCompleted={true} programs={programs} />
          </div>

          <Footer />
        </main>
        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}
