"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { Footer } from "@/components/footer"
import LoadingBI from "@/components/LoadingBI"
import { MetaPixel } from "@/components/MetaPixel"

export default function BootcampDetailsPage() {
  const { slug } = useParams() // âœ… CORRECT

  const [bootcamp, setBootcamp] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const slugValue = Array.isArray(slug) ? slug[0] : slug
    if (!slugValue) return

    const fetchBootcamp = async () => {
      try {
        const res = await fetch(`/api/bootcamps/${slugValue}`)
        if (!res.ok) {
          console.error("Bootcamp fetch failed:", res.status)
          setBootcamp(null)
          setCourses([])
          setModules([])
          setLessons([])
          return
        }
        const data = await res.json()

        console.log("BOOTCAMP FROM API ðŸ‘‰", data.bootcamp)

        setBootcamp(data.bootcamp)
        setCourses(Array.isArray(data.courses) ? data.courses : [])
        setModules(Array.isArray(data.modules) ? data.modules : [])
        setLessons(Array.isArray(data.lessons) ? data.lessons : [])
      } catch (err) {
        console.error(err)
        setBootcamp(null)
        setCourses([])
        setModules([])
        setLessons([])
      } finally {
        setLoading(false)
      }
    }

    fetchBootcamp()
  }, [slug])

  // Aggregate lessons by module and course
  const modulesFromPb = useMemo(() => {
    const result: any[] = []
    if (!Array.isArray(courses) || courses.length === 0) return result

    const modulesByCourse = new Map<string, any[]>()
    for (const m of Array.isArray(modules) ? modules : []) {
      const arr = modulesByCourse.get(m.course) ?? []
      arr.push(m)
      modulesByCourse.set(m.course, arr)
    }

    const lessonsByModule = new Map<string, any[]>()
    for (const l of Array.isArray(lessons) ? lessons : []) {
      const arr = lessonsByModule.get(l.module) ?? []
      arr.push(l)
      lessonsByModule.set(l.module, arr)
    }

    for (let idx = 0; idx < courses.length; idx++) {
      const c = courses[idx]
      const courseMods = modulesByCourse.get(c.slug) ?? []

      result.push({
        title: `Formation ${idx + 1} : ${c.title}`,
        duration: c.durationLabel ?? "",
        lessons: courseMods.map((m) => {
          const modLessons = lessonsByModule.get(m.slug) ?? []
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
    <>
      <MetaPixel />
      <Navbar />
      <main className="px-4 md:px-16">
        <CourseDetailsSection
          variant="guest"
          context="bootcamp"
          courseFromPb={courseFromPb}
          courseId={bootcamp.id}
          courses={courses}
        />
      </main>
      <Footer />
    </>
  )
}
