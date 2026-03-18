"use client"

import { useEffect, useState } from "react"
import { BookOpen, Award } from "lucide-react"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { WelcomeSection } from "@/components/welcome-section"
import { CoursesSection, StudentProgram } from "@/components/student/courses-section"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
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

        const coursesRes = await fetch(`/api/student-programs?studentId=${encodeURIComponent(studentId)}`, {
          signal: controller.signal,
        })

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
                tags: c.tags ?? [],
                image: c.coverImage ?? null,
                completed: isCompleted,
                progress: isCompleted ? 100 : 0, // Fallback until db has progress percent
                variant: c.programType ?? "course",
              }
            }),
          )
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
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Header variant="student" />
          <div className="p-4 md:p-8 space-y-6">
            <WelcomeSection name={studentName} variant="student" />

            {/* KPI Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <StatCard icon={BookOpen} label="Formations actives" value={activeCount} accent />
              <StatCard icon={Award} label="Terminées" value={completedCount} />
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
