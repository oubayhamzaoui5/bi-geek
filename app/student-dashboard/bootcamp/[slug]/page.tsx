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
import { LayoutDashboard } from "lucide-react"

type BootcampDetails = {
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
    }[]
  }[]
}

export default function BootcampDetailsPageBySlug() {
  const params = useParams()
  const slug = (params?.slug as string) ?? ""

  const [bootcamp, setBootcamp] = useState<BootcampDetails | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
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

        const url = studentId ? `/api/bootcamps/${slug}?studentId=${encodeURIComponent(studentId)}` : `/api/bootcamps/${slug}`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()

        setBootcamp(data.bootcamp ?? null)
        setCourses(Array.isArray(data.courses) ? data.courses : [])
        setModules(Array.isArray(data.modules) ? data.modules : [])
        setLessons(Array.isArray(data.lessons) ? data.lessons : [])
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Student bootcamp fetch error:", err)
        }
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [slug])

  const modulesFromPb = useMemo(() => {
    const result: CurriculumModule[] = []
    if (!Array.isArray(courses) || courses.length === 0) return result

    const modulesByCourse = new Map<string, any[]>()
    for (const m of modules) {
      const arr = modulesByCourse.get(m.courseId || m.course) ?? []
      arr.push(m)
      modulesByCourse.set(m.courseId || m.course, arr)
    }

    const lessonsByModule = new Map<string, any[]>()
    for (const l of lessons) {
      const arr = lessonsByModule.get(l.moduleId || l.module) ?? []
      arr.push(l)
      lessonsByModule.set(l.moduleId || l.module, arr)
    }

    for (let idx = 0; idx < courses.length; idx++) {
      const c = courses[idx]
      const courseMods = modulesByCourse.get(c.id) ?? []

      for (let midx = 0; midx < courseMods.length; midx++) {
        const m = courseMods[midx]
        const modLessons = lessonsByModule.get(m.id) ?? []

        result.push({
          title: `[${c.title}] - ${m.title}`,
          duration: m.durationLabel ?? m.duration ?? "",
          locked: m.locked,
          lessons: modLessons.map(l => {
            const youtubeLinks = Array.isArray(l.youtubeLinks) ? l.youtubeLinks : []
            // Add playback links
            const videoContents = youtubeLinks.map((link: any, vIdx: number) => ({
              title: link.title ?? link.description ?? `Vidéo ${vIdx + 1}`,
              type: "video" as const,
              href: link.url,
            }))

            return {
              title: l.title,
              duration: l.durationLabel ?? l.duration ?? "",
              locked: l.locked,
              contents: videoContents
            }
          })
        })
      }
    }

    return result
  }, [courses, modules, lessons])

  const totalLessons = useMemo(
    () => modulesFromPb.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0),
    [modulesFromPb],
  )
  const completedLessons = 0 // Future DB
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const { totalVideos, totalArticles } = useMemo(() => {
    let videos = 0
    let articles = 0
    modulesFromPb.forEach((m) => {
      m.lessons.forEach((lesson) => {
        ;(lesson.contents ?? []).forEach((content) => {
          if (content.type === "video") videos += 1
          if (content.type === "document" || content.type === "exercise") articles += 1
        })
      })
    })
    return { totalVideos: videos, totalArticles: articles }
  }, [modulesFromPb])

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

  if (!bootcamp) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-muted/30">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Header />
            <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
              <div className="text-center space-y-4">
                <LayoutDashboard className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p>Bootcamp introuvable.</p>
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
        <main className="flex-1 overflow-auto bg-background text-foreground scroll-smooth pb-20">
          <Header />
          
          <div className="relative pt-10 pb-20 px-4 md:px-8 xl:px-12">
            <div className="max-w-[1400px] mx-auto">

              <div className="mb-12">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
                  {bootcamp.title}
                </h1>
                <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed mb-6">
                  {bootcamp.shortDescription || bootcamp.longDescription}
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 relative items-start">
                <div className="lg:w-[65%] xl:w-[70%] space-y-10 min-w-0 pb-16">
                  <CurriculumSection 
                    modulesFromPb={modulesFromPb} 
                    courseId={bootcamp.id} 
                    context="bootcamp"
                    variant="student" 
                  />
                </div>

                <aside className="lg:w-[35%] xl:w-[30%] space-y-6 flex-shrink-0 lg:sticky lg:top-24 h-fit pb-12 w-full">
                  <CourseProgress
                    completedLessons={completedLessons}
                    totalLessons={totalLessons}
                    coverImage={bootcamp.coverImage}
                    courseTitle={bootcamp.title}
                    stats={{ videos: totalVideos, articles: totalArticles, lessons: totalLessons }}
                  />
                </aside>
              </div>
            </div>
          </div>
        </main>
        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}
