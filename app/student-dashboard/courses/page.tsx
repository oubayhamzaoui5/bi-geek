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

        const res = await fetch(`/api/student-programs?studentId=${encodeURIComponent(studentId)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        const items = (data.programs ?? []) as CoursesApiItem[]
        setCourses(
          items.map((c: any) => {
            const isCompleted = c.completed === true || c.status === "completed"
            
            return {
              id: c.id,
              slug: c.slug ?? c.id,
              title: c.title,
              progress: isCompleted ? 100 : 0, // Could be replaced by actual progress percentage in future DB iteration
              duration: c.durationLabel ?? "",
              thumbnail: c.coverImage ?? "/placeholder-course.png",
              hasWork: false,
              status: isCompleted ? "completed" : "active",
            }
          }),
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
              title="Prochaines Formations"
              subtitle="Inscrivez-vous avant le début des sessions"
              courses={byStatus("upcoming")}
            />

            <CourseSection
              title="Formations actives"
              subtitle="Reprenez là où vous vous êtes arrêté"
              courses={byStatus("active")}
            />

            <CourseSection
              title="Formations terminées"
              subtitle="Consultez vos formations terminées"
              courses={byStatus("completed")}
            />

            <CourseSection
              title="Formations enregistrées"
              subtitle="Apprenez à votre rythme — contenu prêt à regarder"
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
