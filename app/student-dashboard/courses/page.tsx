"use client"

import { useEffect, useState } from "react"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import { BookOpen } from "lucide-react"

import { Course, CourseStatus } from "@/components/student/CourseCard"
import { CourseSection } from "@/components/student/CourseSection"
import { SidebarProvider } from "@/components/ui/sidebar-context"

type CoursesApiItem = {
  id: string
  slug?: string
  title: string
  durationLabel: string
  coverImage?: string | null
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const getStudentId = () => {
    try {
      const userString = typeof window !== "undefined" ? localStorage.getItem("user") : null
      const user = userString ? JSON.parse(userString) : null
      const id = user?.id ?? user?.record?.id ?? user?.user?.id ?? ""
      return typeof id === "string" ? id.trim() : ""
    } catch {
      return ""
    }
  }


  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        const studentId = getStudentId()
        if (!studentId) {
          setCourses([])
          return
        }

        const res = await fetch(`/api/courses?studentId=${encodeURIComponent(studentId)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        const items = (data.courses ?? []) as CoursesApiItem[]
        setCourses(
          items.map((c) => ({
            id: c.id,
            slug: c.slug ?? c.id,
            title: c.title,
            progress: 0,
            duration: c.durationLabel ?? "",
            thumbnail: c.coverImage ?? "/placeholder-course.png",
            hasWork: false,
            status: "active" as CourseStatus,
          })),
        )
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Student courses fetch error:", err)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [])

  const byStatus = (status: CourseStatus) => courses.filter((c) => c.status === status)

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/30">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          <Header />

          <div className="p-6 md:p-8 space-y-8">
            <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BookOpen className="text-accent" size={28} />
              Formations
            </h2>

            <CourseSection
              title="Prochains Formations"
              subtitle="Inscrivez-vous avant le dÃ©but des sessions"
              courses={byStatus("upcoming")}
            />

            <CourseSection
              title="Formations actifs"
              subtitle="Reprenez lÃ  oÃ¹ vous vous Ãªtes arrÃªtÃ©"
              courses={byStatus("active")}
            />

            <CourseSection
              title="Formations complÃ©tÃ©s"
              subtitle="Consultez vos cours terminÃ©s"
              courses={byStatus("completed")}
            />

            <CourseSection
              title="Formations enregistrÃ©s"
              subtitle="Apprenez Ã  votre rythme â€” contenu prÃªt Ã  regarder"
              courses={byStatus("stored")}
            />
          </div>

          <Footer />
        </main>

        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}
