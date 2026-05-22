"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { Footer } from "@/components/footer"
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
      const courseMods = modulesByCourse.get(c.id) ?? []

      result.push({
        title: `Formation ${idx + 1} : ${c.title}`,
        duration: c.durationLabel ?? "",
        lessons: courseMods.map((m) => {
          const modLessons = lessonsByModule.get(m.id) ?? []
          return {
            title: m.title,
            duration: m.durationLabel ?? m.duration ?? "",
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

  if (loading) return (
    <>
      <Navbar />
      <main className="px-4 md:px-16">
        <div className="-mx-4 overflow-x-clip bg-[#fbfaf8] md:-mx-16">
          <div className="border-b border-zinc-200 bg-white">
            <div className="mx-auto max-w-[86rem] px-4 py-8 md:px-6 md:py-10">
              <div className="mb-6 space-y-3">
                <div className="h-3 w-28 animate-pulse rounded bg-zinc-200" />
                <div className="h-10 w-3/4 animate-pulse rounded bg-zinc-200" />
                <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-zinc-200" />
                <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-200" />
                <div className="mt-4 flex gap-3">
                  <div className="h-11 w-44 animate-pulse rounded-md bg-zinc-200" />
                  <div className="h-11 w-44 animate-pulse rounded-md bg-zinc-200" />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,56rem)_320px]">
                <div className="aspect-video w-full animate-pulse rounded-2xl bg-zinc-200" />
                <div className="animate-pulse rounded-2xl bg-zinc-200" style={{ minHeight: 260 }} />
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-[86rem] px-4 py-14 md:px-6">
            <div className="space-y-4">
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
              <div className="h-8 w-1/2 animate-pulse rounded bg-zinc-200" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-200" />)}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
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
    certificate: !!bootcamp.certificate || courses.some((course) => course.certificate),
    rating: bootcamp.rating ?? 4.8,
    reviewsCount: bootcamp.reviewsCount ?? 0,
    whatYouWillLearn: bootcampWhatYouWillLearn,
    coverImage: bootcamp.image ?? courses[0]?.coverImage ?? null, // fallback to first course
    prerequis: bootcamp.prerequis,
    certifications: Array.isArray(bootcamp.certifications) ? bootcamp.certifications : [],
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
          modules={modulesFromPb}
        />
      </main>
      <Footer />
    </>
  )
}
