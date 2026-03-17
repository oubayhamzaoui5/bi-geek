"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { CurriculumSection } from "@/components/student/curriculum-section"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import { CourseProgress } from "@/components/student/course-progress"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import LoadingBI from "@/components/LoadingBI"

type CourseDetails = {
  id: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  prerequis?: string
  certificate: boolean
  rating: number
  reviewsCount: number
  whatYouWillLearn?: string[]
  coverImage?: string
  certifications?: { title: string; issuer?: string }[]
}

type CurriculumModule = {
  title: string
  duration: string
  lessons: {
    title: string
    duration: string
    locked?: boolean
    contents?: {
      title: string
      type: "video" | "document" | "exercise"
      playbackId?: string
      href?: string
      lessonId?: string
      filename?: string
      courseId?: string
    }[]
  }[]
}

export default function CourseDetailsPageBySlug() {
  const params = useParams()
  const slug = (params?.slug as string) ?? ""

  const [course, setCourse] = useState<CourseDetails | null>(null)
  const [modules, setModules] = useState<CurriculumModule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return

    const controller = new AbortController()

    const load = async () => {
      try {
        const res = await fetch(`/api/courses/${slug}`, { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()

        setCourse(data.guestCourse ?? null)
        setModules((data.studentModules ?? data.guestModules ?? []) as CurriculumModule[])
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Student course fetch error:", err)
        }
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [slug])

  const totalLessons = useMemo(
    () => modules.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0),
    [modules],
  )
  const completedLessons = 0
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const { totalVideos, totalArticles } = useMemo(() => {
    let videos = 0
    let articles = 0
    modules.forEach((m) => {
      m.lessons.forEach((lesson) => {
        ;(lesson.contents ?? []).forEach((content) => {
          if (content.type === "video") videos += 1
          if (content.type === "document" || content.type === "exercise") articles += 1
        })
      })
    })
    return { totalVideos: videos, totalArticles: articles }
  }, [modules])

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-muted/30">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-background text-foreground">
            <Header />
            <div className="flex items-center justify-center min-h-[60vh]">
              <LoadingBI fullScreen={false} />
            </div>
          </main>
          <MessagesTab />
        </div>
      </SidebarProvider>
    )
  }

  if (!course) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-muted/30">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Header />
            <div className="p-6 md:p-8 text-muted-foreground">Cours introuvable.</div>
          </main>
          <MessagesTab />
        </div>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background text-foreground">
          <Header />
          <div className="space-y-8 pb-12">
            <section className="relative overflow-hidden border-b border-border">
              <div className="absolute inset-0">
                <div
                  className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-30"
                  style={{
                    backgroundImage: `url(${course.coverImage ?? "/placeholder-course.png"})`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background" />
              </div>

              <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-12 lg:pt-16 pb-14">
                <div className="max-w-3xl space-y-4">
                  <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                    Parcours apprenant
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-semibold text-foreground leading-tight">
                    {course.title}
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl line-clamp-2">
                    {course.shortDescription || course.longDescription}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 text-xs sm:text-sm">
                  <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-foreground">
                    {totalLessons} leçons
                  </span>
                  <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-foreground">
                    {course.durationLabel}
                  </span>
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
                    Intermédiaire
                  </span>
                  <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-accent">
                    {progressPercent}% complété
                  </span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-accent to-primary"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </section>

            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="flex flex-col lg:flex-row gap-8">
                <section className="lg:w-[65%] space-y-6">
                  <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
                    <h2 className="text-lg font-semibold text-foreground mb-3">Description</h2>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {course.longDescription}
                    </p>
                  </div>

                  <CurriculumSection modulesFromPb={modules} courseId={course?.id} />
                </section>

                <aside className="lg:w-[35%] lg:sticky lg:top-24 h-fit">
                  <CourseProgress
                    completedLessons={completedLessons}
                    totalLessons={totalLessons}
                    coverImage={course.coverImage}
                    courseTitle={course.title}
                    stats={{ videos: totalVideos, articles: totalArticles, lessons: totalLessons }}
                  />
                </aside>
              </div>
            </div>
          </div>
          <Footer />
        </main>
        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}
