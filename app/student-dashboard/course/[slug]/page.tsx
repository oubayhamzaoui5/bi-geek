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
import { Clock, BookOpen, Award, Sparkles, LayoutDashboard } from "lucide-react"

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
  locked?: boolean
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
        let studentId = ""
        try {
          const userString = typeof window !== "undefined" ? localStorage.getItem("user") : null
          const user = userString ? JSON.parse(userString) : null
          studentId = (user?.id as string | undefined) ?? ""
        } catch {
          studentId = ""
        }

        const url = studentId ? `/api/courses/${slug}?studentId=${encodeURIComponent(studentId)}` : `/api/courses/${slug}`
        const res = await fetch(url, { signal: controller.signal })
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
  const unlockedLessons = useMemo(
    () => modules.reduce((sum, m) => sum + (m.lessons?.filter(l => !l.locked).length ?? 0), 0),
    [modules],
  )
  const progressPercent = totalLessons > 0 ? Math.round((unlockedLessons / totalLessons) * 100) : 0

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
            <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
              <div className="text-center space-y-4">
                <LayoutDashboard className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p>Cours introuvable.</p>
              </div>
            </div>
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
            {/* Modern Full-Width Hero Banner */}
            <section className="relative w-full min-h-[50vh] lg:min-h-[60vh] flex items-end pt-32 pb-16">
              {/* Full Width Background Image Layer */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${course.coverImage ?? "/placeholder-course.png"})`,
                  }}
                />
                {/* Smooth Fade-to-Background Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
              </div>

              {/* Foreground Content */}
              <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10">
                <div className="max-w-4xl space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/90 backdrop-blur-md text-white border border-accent/20 text-xs font-bold tracking-widest uppercase shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    Parcours apprenant
                  </div>
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-sans font-extrabold text-foreground leading-tight tracking-tight drop-shadow-md">
                    {course.title}
                  </h1>
                  
                  <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl leading-relaxed font-medium drop-shadow-sm">
                    {course.shortDescription || course.longDescription}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground bg-background/50 border border-border/50 px-5 py-2.5 rounded-xl backdrop-blur-lg shadow-sm">
                      <BookOpen className="w-5 h-5 text-accent" />
                      {totalLessons} leçons
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground bg-background/50 border border-border/50 px-5 py-2.5 rounded-xl backdrop-blur-lg shadow-sm">
                      <Clock className="w-5 h-5 text-accent" />
                      {course.durationLabel}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground bg-background/50 border border-border/50 px-5 py-2.5 rounded-xl backdrop-blur-lg shadow-sm">
                      <Award className="w-5 h-5 text-amber-500" />
                      {course.certificate ? "Certifiant" : "Attestation"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-8">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
                <section className="lg:w-[65%] xl:w-[70%] space-y-8">
                  {/* Modern Description Card */}
                  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 lg:p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 text-accent" />
                      À propos de ce cours
                    </h2>
                    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                      {course.longDescription}
                    </div>
                  </div>

                  <CurriculumSection modulesFromPb={modules} courseId={course?.id} />
                </section>

                <aside className="lg:w-[35%] xl:w-[30%] space-y-6 lg:sticky lg:top-24 h-fit pb-12">
                  <CourseProgress
                    completedLessons={unlockedLessons}
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
