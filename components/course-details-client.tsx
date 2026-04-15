"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { Footer } from "@/components/footer"
import LoadingBI from "@/components/LoadingBI"
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

  if (loading) return <LoadingBI />
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
        />
      </main>
      <Footer />
    </>
  )
}
