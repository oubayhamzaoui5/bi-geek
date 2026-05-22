"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { Footer } from "@/components/footer"
import { MetaPixel } from "@/components/MetaPixel"

export default function CourseDetailsPage() {
 const { slug } = useParams() // ✅ CORRECT
  const [guestCourse, setGuestCourse] = useState<any>(null)
  const [instructor, setInstructor] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return

    const fetchCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${slug}`)
        const data = await res.json()

        setGuestCourse(data.guestCourse)
        setInstructor(data.instructorFromPb)
        setModules(data.guestModules)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [slug])

  if (loading) return (
    <>
      <Navbar />
      <main className="px-4 md:px-16">
        <div className="-mx-4 overflow-x-clip bg-[#fbfaf8] md:-mx-16">
          {/* Hero skeleton */}
          <div className="border-b border-zinc-200 bg-white">
            <div className="mx-auto max-w-[86rem] px-4 py-8 md:px-6 md:py-10">
              <div className="mb-6 space-y-3">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
                <div className="h-10 w-3/4 animate-pulse rounded bg-zinc-200" />
                <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-zinc-200" />
                <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-200" />
                <div className="mt-4 flex gap-3">
                  <div className="h-11 w-40 animate-pulse rounded-md bg-zinc-200" />
                  <div className="h-11 w-44 animate-pulse rounded-md bg-zinc-200" />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,56rem)_320px]">
                <div className="aspect-video w-full animate-pulse rounded-2xl bg-zinc-200" />
                <div className="animate-pulse rounded-2xl bg-zinc-200" style={{ minHeight: 260 }} />
              </div>
            </div>
          </div>
          {/* Content skeleton */}
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
  if (!guestCourse) return <div className="p-6">Course not found</div>

  return (
    <>
      <MetaPixel />
      <Navbar />
      <main className="px-4 md:px-16">
        <CourseDetailsSection
          variant="guest"
          context="course"
          courseFromPb={guestCourse}
          modules={modules}
        />
      </main>
      <Footer />
    </>
  )
}
