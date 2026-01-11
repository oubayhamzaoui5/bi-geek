"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { Footer } from "@/components/footer"
import LoadingBI from "@/components/LoadingBI"

export default function BootcampDetailsPage() {
  const params = useParams()
  const id = (params?.id as string) ?? ""

  const [bootcamp, setBootcamp] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchBootcamp = async () => {
      try {
        const res = await fetch(`/api/bootcamps/${id}`)
        const data = await res.json()

        console.log("BOOTCAMP FROM API 👉", data.bootcamp)

        setBootcamp(data.bootcamp)
        setCourses(data.courses)
        setModules(data.modules)
        setLessons(data.lessons)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBootcamp()
  }, [id])

  // Aggregate lessons by module and course
  const modulesFromPb = useMemo(() => {
    const result: any[] = []
    if (!courses.length) return result

    const modulesByCourse = new Map<string, any[]>()
    for (const m of modules) {
      const arr = modulesByCourse.get(m.course) ?? []
      arr.push(m)
      modulesByCourse.set(m.course, arr)
    }

    const lessonsByModule = new Map<string, any[]>()
    for (const l of lessons) {
      const arr = lessonsByModule.get(l.module) ?? []
      arr.push(l)
      lessonsByModule.set(l.module, arr)
    }

    for (let idx = 0; idx < courses.length; idx++) {
      const c = courses[idx]
      const courseMods = modulesByCourse.get(c.id) ?? []

      result.push({
        title: `Formation ${idx + 1} : ${c.title}`,
        duration: c.durationLabel ?? "",
        lessons: courseMods.map((m) => {
          const modLessons = lessonsByModule.get(m.id) ?? []
          return {
            title: m.title,
            duration: m.duration ?? "",
            contents: modLessons.map((l) => ({
              title: l.title,
              type: "video" as const,
            })),
          }
        }),
      })
    }

    return result
  }, [courses, modules, lessons])

  const bootcampWhatYouWillLearn = useMemo(() => {
    const items: string[] = []
    for (const c of courses) {
      if (c.whatYouWillLearn?.length) {
        for (const w of c.whatYouWillLearn) {
          if (!items.includes(w)) items.push(w)
        }
      }
    }
    return items
  }, [courses])

  if (loading) return <LoadingBI />
  if (!bootcamp) return <div className="p-6">Bootcamp not found</div>

  const courseFromPb = {
    id: bootcamp.id,
    title: bootcamp.title,
    shortDescription: bootcamp.shortDescription ?? bootcamp.description ?? "",
    longDescription:
      bootcamp.longDescription ??
      bootcamp.shortDescription ??
      bootcamp.description ??
      "",
    durationLabel: bootcamp.durationLabel ?? (bootcamp.hours ? `${bootcamp.hours} heures` : ""),
    levelLabel: bootcamp.levelLabel ?? "",
    certificate: !!bootcamp.certificate,
    rating: bootcamp.rating ?? 4.8,
    reviewsCount: bootcamp.reviewsCount ?? 0,
    whatYouWillLearn: bootcampWhatYouWillLearn,
    coverImage: bootcamp.image ?? courses[0]?.coverImage ?? null, // fallback to first course
    prerequis: bootcamp.prerequis,
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <main className="flex-1 overflow-auto">
        <Navbar />
        <div className="space-y-6">
          <CourseDetailsSection
            variant="guest"
            context="bootcamp"
            courseFromPb={courseFromPb} // bootcamp main info
            courseId={bootcamp.id}
            courses={courses} // all courses for certifications
          />
        </div>
        <Footer />
      </main>
    </div>
  )
}
