"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import PocketBase from "pocketbase"

import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { CurriculumSection } from "@/components/student/curriculum-section"
import { Footer } from "@/components/footer"

type Bootcamp = {
  id: string
  title: string
  // new structure
  shortDescription?: string
  longDescription?: string
  durationLabel?: string
  levelLabel?: string
  certificate?: boolean
  rating?: number
  reviewsCount?: number
  isPublished?: boolean
  // optional legacy fields kept for safety
  description?: string
  hours?: number
}

type Course = {
  id: string
  title: string
  durationLabel?: string
  levelLabel?: string
  shortDescription?: string
  longDescription?: string
  // used to build bootcamp "Ce que vous apprendrez :"
  whatYouWillLearn?: string[]
}

type BootcampCourse = {
  id: string
  bootcamp: string
  course: string
  order: number
  expand?: { course?: Course }
}

type CourseModule = {
  id: string
  course: string
  title: string
  duration: string
  order: number
}

type CourseLesson = {
  id: string
  module: string
  title: string
  duration: string
  order: number
}

export default function BootcampDetailsPage() {
  const params = useParams()
  const id = (params?.id as string) ?? ""

  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [modules, setModules] = useState<CourseModule[]>([])
  const [lessons, setLessons] = useState<CourseLesson[]>([])

  useEffect(() => {
    if (!id) return

    const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

    const load = async () => {
      try {
        // 1) Bootcamp
        const b = await pb.collection("bootcamps").getOne<Bootcamp>(id)
        setBootcamp(b)

        // 2) Courses in this bootcamp (ordered formations)
        const pivots = await pb.collection("bootcamp_courses").getFullList<BootcampCourse>({
          filter: `bootcamp="${id}"`,
          sort: "order",
          expand: "course",
        })

        const orderedCourses = pivots.map((p) => p.expand?.course).filter(Boolean) as Course[]
        setCourses(orderedCourses)

        if (!orderedCourses.length) {
          setModules([])
          setLessons([])
          return
        }

        // 3) Fetch all modules for these courses (formations)
        const courseFilter = orderedCourses.map((c) => `course="${c.id}"`).join(" || ")

        const mods = await pb.collection("course_modules").getFullList<CourseModule>({
          filter: courseFilter,
          sort: "course,order",
        })
        setModules(mods)

        if (!mods.length) {
          setLessons([])
          return
        }

        // 4) Fetch all lessons for these modules
        const moduleFilter = mods.map((m) => `module="${m.id}"`).join(" || ")

        const les = await pb.collection("course_lessons").getFullList<CourseLesson>({
          filter: moduleFilter,
          sort: "module,order",
        })
        setLessons(les)
      } catch (err) {
        console.error("Error fetching bootcamp details", {
          status: (err as any)?.status,
          message: (err as any)?.message,
          data: (err as any)?.data,
        })
      }
    }

    load()
  }, [id])

  // ✅ Build Formation -> Modules -> Lessons for CurriculumSection
  const modulesFromPb = useMemo(() => {
    if (!courses.length) return undefined

    // group modules by courseId
    const modulesByCourse = new Map<string, CourseModule[]>()
    for (const m of modules) {
      const arr = modulesByCourse.get(m.course) ?? []
      arr.push(m)
      modulesByCourse.set(m.course, arr)
    }

    // group lessons by moduleId
    const lessonsByModule = new Map<string, CourseLesson[]>()
    for (const l of lessons) {
      const arr = lessonsByModule.get(l.module) ?? []
      arr.push(l)
      lessonsByModule.set(l.module, arr)
    }

    return courses.map((c, idx) => {
      const courseMods = modulesByCourse.get(c.id) ?? []

      return {
        // Formation (top accordion)
        title: `Formation ${idx + 1} : ${c.title}`,
        duration: c.durationLabel ?? "",
        // Modules (second accordion)
        lessons: courseMods.map((m) => {
          const modLessons = lessonsByModule.get(m.id) ?? []
          return {
            title: m.title,
            duration: m.duration ?? "",
            // Lessons list
            contents: modLessons.map((l) => ({
              title: l.title,
              type: "video" as const, // keep simple (your UI just needs title)
            })),
          }
        }),
      }
    })
  }, [courses, modules, lessons])

  // ✅ Aggregate "Ce que vous apprendrez" from child formations (courses) in order
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

  // Bootcamp details -> CourseDetailsSection (guest bootcamp)
  const courseFromPb =
    bootcamp
      ? {
          id: bootcamp.id,
          title: bootcamp.title,
          // new structure for descriptions
          shortDescription: bootcamp.shortDescription ?? bootcamp.description ?? "",
          longDescription:
            bootcamp.longDescription ??
            bootcamp.shortDescription ??
            bootcamp.description ??
            "",
          durationLabel:
            bootcamp.durationLabel ??
            (bootcamp.hours ? `${bootcamp.hours} heures` : ""),
          levelLabel: bootcamp.levelLabel ?? "",
          certificate: !!bootcamp.certificate,
          rating: bootcamp.rating ?? 4.8,
          reviewsCount: bootcamp.reviewsCount ?? 0,
          // filled from child formations if available
          whatYouWillLearn: bootcampWhatYouWillLearn,
        }
      : undefined

  return (
    <div className="flex h-screen bg-muted/30">
      <main className="flex-1 overflow-auto">
        <Navbar />
        <div className="p-6 md:p-8 space-y-6">
          <CourseDetailsSection
            variant="guest"
            context="bootcamp"
            courseFromPb={courseFromPb}
            courseId={bootcamp?.id ?? ""}
          />

          <CurriculumSection
            variant="guest"
            context="bootcamp"
            modulesFromPb={modulesFromPb}
          />
        </div>
        <Footer />
      </main>
    </div>
  )
}
