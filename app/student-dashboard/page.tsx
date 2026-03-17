"use client"

import { useEffect, useState } from "react"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { WelcomeSection } from "@/components/welcome-section"
import { CoursesSection, StudentProgram } from "@/components/student/courses-section"
import { UpcomingSessions, Session } from "@/components/student/upcoming-sessions"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import { RecentAnnouncements, Announcement } from "@/components/student/recent-announcements"
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

export default function Dashboard() {
  const [studentName, setStudentName] = useState("Ã‰tudiant")
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
        "Ã‰tudiant"
      setStudentName(name)
    } catch {
      setStudentName("Ã‰tudiant")
    }
  }, [])

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Header />
          <div className="p-6 md:p-8 space-y-6">
            <WelcomeSection name={studentName} variant="student" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div className="h-full min-h-0">
                <UpcomingSessions sessions={sessions} />
              </div>
              <div className="h-full min-h-0">
                <RecentAnnouncements announcements={announcements} />
              </div>
            </div>

            <CoursesSection showCompleted={false} programs={programs} />
            <div className="mb-12" />
            <CoursesSection showCompleted={true} programs={programs} />
          </div>

          <Footer />
        </main>
        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}
